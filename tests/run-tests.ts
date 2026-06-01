import assert from "node:assert/strict";
import { can, permissionsForLevel } from "../src/lib/permissions";
import { GET as healthGet } from "../src/app/api/health/route";
import { redactProhibited } from "../src/lib/ai/redaction";
import { chunkSopText } from "../src/lib/ai/chunker";
import { __testHooks } from "../src/lib/ai/sop-answerer";
import { estimateLine } from "../src/lib/quoting";
import { aggregateActuals } from "../src/lib/cycle-time-aggregation";
import { deriveOperationActual } from "../src/lib/job-actuals";
import { csvCell, toCsv } from "../src/lib/export/csv";
import { parseProShopDate } from "../src/lib/proshop/work-orders";
import { averageAgeDays, maxAgeDays, onTimeRate, reworkRate, utilizationPct } from "../src/lib/metrics";

const mode = process.argv[2] ?? "all";

async function runUnit() {
  assert.equal(can("USER", "ticket:create"), true);
  assert.equal(can("USER", "admin:manage"), false);
  assert.equal(can("USER", "report:export"), false);
  assert.equal(can("USER", "payroll:export"), false);
  assert.equal(can("MANAGER", "ticket:manage"), true);
  assert.equal(can("MANAGER", "payroll:export"), false);
  assert.equal(can("DIRECTOR", "approval:decide"), true);
  assert.equal(can("DIRECTOR", "admin:manage"), false);
  assert.equal(permissionsForLevel("ADMIN").includes("admin:manage"), true);
  assert.equal(permissionsForLevel("ADMIN").includes("audit:view"), true);
  assert.equal(permissionsForLevel("ADMIN").includes("payroll:export"), true);

  // SOP / AI / quiz permissions
  assert.equal(can("USER", "sop:ask"), true);
  assert.equal(can("USER", "sop:approve"), false);
  assert.equal(can("MANAGER", "sop:author"), true);
  assert.equal(can("MANAGER", "sop:approve"), false);
  assert.equal(can("DIRECTOR", "sop:approve"), true);
  assert.equal(permissionsForLevel("ADMIN").includes("sop:admin"), true);
  assert.equal(permissionsForLevel("ADMIN").includes("ai:audit"), true);

  // Redaction
  const ssn = redactProhibited("SSN is 123-45-6789");
  assert.ok(!ssn.redactedText.includes("123-45-6789"));
  assert.ok(ssn.applied.includes("ssn"));
  const clean = redactProhibited("How do I run FAI?");
  assert.equal(clean.applied.length, 0);

  // Chunker
  const chunks = chunkSopText({
    rawText: "# Quality\n\n## 3 First Piece\n\nMeasure on the CMM before run authorization.\n\n## 4 Calibration\n\nCheck calibration date."
  });
  assert.ok(chunks.length >= 1);
  assert.ok(chunks.some((c) => c.headingPath.includes("First Piece")));

  // Answerer gates
  assert.ok(__testHooks.CONFIDENCE_FLOOR >= 0.6);
  assert.ok(__testHooks.SYSTEM_PROMPT.includes("ONLY"));

  // Quote permissions
  assert.equal(can("USER", "quote:view"), true);
  assert.equal(can("USER", "quote:create"), false);
  assert.equal(can("MANAGER", "quote:create"), true);
  assert.equal(can("MANAGER", "quote:submit"), false);
  assert.equal(can("DIRECTOR", "quote:submit"), true);
  assert.equal(can("DIRECTOR", "cycletime:manage"), true);
  assert.equal(can("MANAGER", "cycletime:manage"), false);
  assert.equal(permissionsForLevel("ADMIN").includes("quote:admin"), true);

  // Job-actual permissions (feedback loop): managers and up record actuals.
  assert.equal(can("USER", "jobactual:record"), false);
  assert.equal(can("MANAGER", "jobactual:record"), true);
  assert.equal(can("DIRECTOR", "jobactual:record"), true);
  assert.equal(permissionsForLevel("ADMIN").includes("jobactual:record"), true);

  // Quoting math — load-bearing for the entire quoting flow.
  // Zero-margin: total equals subtotal, unitPrice = total / quantity.
  const noMargin = estimateLine({
    quantity: 10,
    setupHours: 2,
    cycleMinutesPerPiece: 6,
    materialCostPerUnit: 5,
    laborRatePerHour: 60,
    burdenRatePerHour: 40,
    marginPercent: 0
  });
  // 2h setup + 60min cycle (10 * 6 / 60 = 1h) = 3h. Labor 180, burden 120, material 50.
  assert.equal(noMargin.totalHours, 3);
  assert.equal(noMargin.laborCost, 180);
  assert.equal(noMargin.burdenCost, 120);
  assert.equal(noMargin.materialCost, 50);
  assert.equal(noMargin.subtotal, 350);
  assert.equal(noMargin.marginAmount, 0);
  assert.equal(noMargin.total, 350);
  assert.equal(noMargin.unitPrice, 35);

  // 25% margin: total = subtotal / (1 - 0.25) so margin is 25% of total.
  const withMargin = estimateLine({
    quantity: 4,
    setupHours: 1,
    cycleMinutesPerPiece: 15,
    materialCostPerUnit: 10,
    laborRatePerHour: 50,
    burdenRatePerHour: 30,
    marginPercent: 25
  });
  // 1h setup + 1h cycle = 2h. Labor 100, burden 60, material 40. Subtotal 200.
  assert.equal(withMargin.subtotal, 200);
  // total = 200 / 0.75 = 266.6666... → rounded to 2 = 266.67
  assert.equal(withMargin.total, 266.67);
  assert.equal(withMargin.marginAmount, 66.67);
  // unitPrice derived from UNROUNDED total: 266.6666... / 4 = 66.6666... → rounded(4) = 66.6667
  assert.equal(withMargin.unitPrice, 66.6667);

  // Margin clamped at 95% — a 100% margin input must not divide by zero.
  const clampedMargin = estimateLine({
    quantity: 1,
    setupHours: 0,
    cycleMinutesPerPiece: 0,
    materialCostPerUnit: 100,
    laborRatePerHour: 0,
    burdenRatePerHour: 0,
    marginPercent: 100
  });
  // 100% input → clamped to 95%. total = 100 / (1 - 0.95) = 2000.
  assert.equal(clampedMargin.subtotal, 100);
  assert.equal(clampedMargin.total, 2000);

  // Zero quantity must not divide by zero in unitPrice.
  const zeroQty = estimateLine({
    quantity: 0,
    setupHours: 1,
    cycleMinutesPerPiece: 10,
    materialCostPerUnit: 5,
    laborRatePerHour: 50,
    burdenRatePerHour: 25,
    marginPercent: 20
  });
  assert.equal(zeroQty.unitPrice, 0);
  assert.equal(zeroQty.materialCost, 0);

  // CSV export util (shared by every dashboard export).
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell(42), "42");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
  // Quotes are doubled and the field wrapped.
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  // Commas and newlines force quoting.
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  const csv = toCsv(
    [
      { key: "name", label: "Name" },
      { key: "qty", label: "Qty" }
    ],
    [
      { name: "Widget, A", qty: 3 },
      { name: "Bracket", qty: 10 }
    ]
  );
  assert.equal(csv, 'Name,Qty\n"Widget, A",3\nBracket,10');
  // Header-only when no rows.
  assert.equal(toCsv([{ key: "x", label: "X" }], []), "X");

  // Operation-actual derivation (completion → cycle-time feedback).
  // 100 pieces in 5 run hours = 300 min / 100 = 3.0 min/pc; setup as-is.
  const opDerive = deriveOperationActual({ actualSetupHours: 1.5, actualRunHours: 5, completedQuantity: 100 });
  assert.ok(opDerive);
  assert.equal(opDerive!.setupHours, 1.5);
  assert.equal(opDerive!.cycleMinutesPerPiece, 3);
  // Zero completed quantity → null (cannot derive per-piece cycle).
  assert.equal(
    deriveOperationActual({ actualSetupHours: 2, actualRunHours: 4, completedQuantity: 0 }),
    null
  );
  // No run and no setup → null (nothing to record).
  assert.equal(
    deriveOperationActual({ actualSetupHours: 0, actualRunHours: 0, completedQuantity: 10 }),
    null
  );
  // Setup-only operation (e.g. inspection) still records, cycle = 0.
  const setupOnly = deriveOperationActual({ actualSetupHours: 0.5, actualRunHours: 0, completedQuantity: 5 });
  assert.ok(setupOnly);
  assert.equal(setupOnly!.cycleMinutesPerPiece, 0);
  assert.equal(setupOnly!.setupHours, 0.5);

  // ProShop date parsing (epoch seconds, epoch millis, ISO, empty).
  assert.equal(parseProShopDate(null), null);
  assert.equal(parseProShopDate(""), null);
  assert.equal(parseProShopDate(undefined), null);
  // Epoch seconds (< 1e12) are scaled to millis.
  assert.equal(parseProShopDate(1_700_000_000)?.getTime(), 1_700_000_000_000);
  // Epoch millis (> 1e12) pass through.
  assert.equal(parseProShopDate(1_700_000_000_000)?.getTime(), 1_700_000_000_000);
  // ISO string parses.
  assert.equal(parseProShopDate("2026-01-15T00:00:00.000Z")?.toISOString(), "2026-01-15T00:00:00.000Z");
  // Garbage → null.
  assert.equal(parseProShopDate("not-a-date"), null);

  // Machine-shop metric helpers.
  assert.equal(utilizationPct(80, 40), 200);
  assert.equal(utilizationPct(20, 40), 50);
  assert.equal(utilizationPct(10, 0), 0); // no divide-by-zero
  assert.equal(reworkRate(0, 0), null); // nothing decided
  assert.equal(reworkRate(3, 12), 25);
  assert.equal(onTimeRate([]), null);
  assert.equal(onTimeRate([{ completedAtMs: 5, dueMs: null }]), null);
  assert.equal(
    onTimeRate([
      { completedAtMs: 10, dueMs: 20 },
      { completedAtMs: 30, dueMs: 20 },
      { completedAtMs: 5, dueMs: null }
    ]),
    50
  );
  const metricsNow = 10 * 86_400_000;
  assert.equal(averageAgeDays([8 * 86_400_000, 2 * 86_400_000], metricsNow), 5);
  assert.equal(maxAgeDays([8 * 86_400_000, 2 * 86_400_000], metricsNow), 8);
  assert.equal(averageAgeDays([], metricsNow), null);

  // Cycle-time aggregation (feedback loop).
  // No samples → null (caller keeps prior estimate).
  assert.equal(aggregateActuals([]), null);
  // Samples with non-positive quantity are ignored → null when all unusable.
  assert.equal(
    aggregateActuals([{ quantity: 0, actualSetupHours: 1, actualCycleMinutesPerPiece: 5 }]),
    null
  );

  // Single perfectly-consistent sample: estimate equals the sample, but
  // confidence is low because n=1 (sampleFactor = 1/20 = 0.05).
  const one = aggregateActuals([
    { quantity: 10, actualSetupHours: 2, actualCycleMinutesPerPiece: 6 }
  ]);
  assert.ok(one);
  assert.equal(one!.estimatedSetupHours, 2);
  assert.equal(one!.estimatedCycleMinutes, 6);
  assert.equal(one!.sampleSize, 1);
  assert.equal(one!.confidenceScore, 0.05);

  // Quantity-weighted cycle mean: a 100-piece run at 4 min should pull the
  // estimate toward 4 far more than a 1-piece run at 10 min.
  // weighted = (4*100 + 10*1) / 101 = 410/101 = 4.0594...
  const weighted = aggregateActuals([
    { quantity: 100, actualSetupHours: 1, actualCycleMinutesPerPiece: 4 },
    { quantity: 1, actualSetupHours: 3, actualCycleMinutesPerPiece: 10 }
  ]);
  assert.ok(weighted);
  assert.equal(weighted!.estimatedCycleMinutes, 4.059);
  // Setup is a simple mean: (1 + 3) / 2 = 2.
  assert.equal(weighted!.estimatedSetupHours, 2);
  assert.equal(weighted!.sampleSize, 2);

  // Consistency: identical cycle values → consistencyFactor = 1, so
  // confidence is driven purely by sampleFactor. 10 identical samples →
  // sampleFactor = 0.5, consistencyFactor = 1 → confidence = 0.5.
  const consistent = aggregateActuals(
    Array.from({ length: 10 }, () => ({
      quantity: 5,
      actualSetupHours: 1,
      actualCycleMinutesPerPiece: 8
    }))
  );
  assert.ok(consistent);
  assert.equal(consistent!.confidenceScore, 0.5);
  assert.equal(consistent!.estimatedCycleMinutes, 8);

  // Spread reduces confidence: same n=10 but high variance in cycle values
  // must yield lower confidence than the consistent case above.
  const noisy = aggregateActuals(
    Array.from({ length: 10 }, (_unused, i) => ({
      quantity: 5,
      actualSetupHours: 1,
      actualCycleMinutesPerPiece: i % 2 === 0 ? 2 : 14
    }))
  );
  assert.ok(noisy);
  assert.ok(
    noisy!.confidenceScore < consistent!.confidenceScore,
    "high-variance samples should score lower confidence than consistent ones"
  );
}

async function runIntegration() {
  const response = await healthGet();
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.appName, "CleanOps Command Center");
  assert.equal(typeof payload.databaseConnected, "boolean");
  assert.equal(typeof payload.pushoverEnabled, "boolean");
}

async function main() {
  if (mode === "unit" || mode === "all") {
    await runUnit();
  }
  if (mode === "integration" || mode === "all") {
    await runIntegration();
  }
  console.log(`Tests passed (${mode}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
