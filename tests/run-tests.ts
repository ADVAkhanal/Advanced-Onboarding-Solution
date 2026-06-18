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
import { slaAssess, slaLabel, slaPill, slaWindowHours } from "../src/lib/sla";
import { appError, errorCodeList, ERROR_CODES } from "../src/lib/error-codes";
import { HttpError } from "../src/lib/http";
import { qrMatrix, qrSvg } from "../src/lib/qr";
import { moduleKeysFor } from "../src/lib/search/global-search";
import { getMemo, stableHash } from "../src/lib/cache/snapshots";
import { isLowStock, isOverdue, severityRank, summarizeAlerts } from "../src/lib/action-center";

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

  // Ticket SLA helpers (helpdesk integration).
  const HOUR = 3_600_000;
  assert.equal(slaWindowHours("WORK_STOPPAGE"), 1);
  assert.equal(slaWindowHours("NORMAL"), 24);
  assert.equal(slaWindowHours("UNKNOWN_PRIORITY"), 24); // safe default
  // Fresh NORMAL ticket at 6h of a 24h window → 25%, ok.
  const slaOk = slaAssess({ createdAtMs: 0, priority: "NORMAL", nowMs: 6 * HOUR });
  assert.equal(slaOk.state, "ok");
  assert.equal(slaOk.pct, 25);
  assert.equal(slaOk.hoursOver, null);
  assert.equal(slaLabel(slaOk), "25% SLA");
  assert.equal(slaPill(slaOk.state), "green");
  // 75% of window is the risk threshold (18h of 24h).
  const slaRisk = slaAssess({ createdAtMs: 0, priority: "NORMAL", nowMs: 18 * HOUR });
  assert.equal(slaRisk.state, "risk");
  assert.equal(slaPill(slaRisk.state), "amber");
  // Past the window → breach with whole hours over (27h of 24h → +3h).
  const slaBreach = slaAssess({ createdAtMs: 0, priority: "NORMAL", nowMs: 27 * HOUR });
  assert.equal(slaBreach.state, "breach");
  assert.equal(slaBreach.hoursOver, 3);
  assert.equal(slaLabel(slaBreach), "+3h over");
  assert.equal(slaPill(slaBreach.state), "red");
  // Satisfied tickets stop the clock: closed at 2h stays "ok"/met even later.
  const slaMet = slaAssess({ createdAtMs: 0, satisfiedAtMs: 2 * HOUR, priority: "NORMAL", nowMs: 100 * HOUR });
  assert.equal(slaMet.state, "ok");
  assert.equal(slaMet.satisfied, true);
  assert.equal(slaLabel(slaMet), "met");
  // Closed late stays breached (closed at 30h of a 24h window).
  const slaLate = slaAssess({ createdAtMs: 0, satisfiedAtMs: 30 * HOUR, priority: "NORMAL", nowMs: 100 * HOUR });
  assert.equal(slaLate.state, "breach");
  assert.equal(slaLate.hoursOver, 6);
  // WORK_STOPPAGE has a 1-hour window: 45 minutes in is already risk.
  const slaWs = slaAssess({ createdAtMs: 0, priority: "WORK_STOPPAGE", nowMs: 0.75 * HOUR });
  assert.equal(slaWs.state, "risk");
  // Clock never goes negative (createdAt in the future → 0%).
  assert.equal(slaAssess({ createdAtMs: 10 * HOUR, priority: "LOW", nowMs: 0 }).pct, 0);

  // Error-code catalog (MODULE-CODE contract).
  const crmErr = appError("CRM-502");
  assert.ok(crmErr instanceof HttpError);
  assert.equal(crmErr.status, 502);
  assert.equal(crmErr.code, "CRM-502"); // machine code is preserved for clients
  assert.ok(crmErr.message.length > 0);
  // detail is appended to the canonical message.
  assert.ok(appError("SHIP-404", "Token abc.").message.includes("Token abc."));
  // Every code is MODULE-CODE shaped with a sane HTTP status and a message.
  const codes = errorCodeList();
  assert.ok(codes.length === Object.keys(ERROR_CODES).length && codes.length > 0);
  for (const c of codes) {
    assert.match(c.code, /^[A-Z]+-[0-9]+$/, `bad error code shape: ${c.code}`);
    assert.ok(c.status >= 400 && c.status <= 599, `bad status for ${c.code}`);
    assert.ok(c.message.trim().length > 0, `empty message for ${c.code}`);
  }

  // Integration bridges: env-gated both ways (ADR 0001 — disabled by default).
  const { isTwentyConfigured, twentyConfig } = await import("../src/lib/integrations/twenty");
  const { isPapermarkConfigured } = await import("../src/lib/integrations/papermark");
  const savedTwentyUrl = process.env.TWENTY_API_URL;
  const savedTwentyKey = process.env.TWENTY_API_KEY;
  const savedPmKey = process.env.PAPERMARK_API_KEY;
  delete process.env.TWENTY_API_URL;
  delete process.env.TWENTY_API_KEY;
  delete process.env.PAPERMARK_API_KEY;
  assert.equal(isTwentyConfigured(), false, "Twenty must be off without env");
  assert.equal(isPapermarkConfigured(), false, "Papermark must be off without env");
  process.env.TWENTY_API_URL = "https://crm.example.com/";
  process.env.TWENTY_API_KEY = "test-key";
  assert.equal(isTwentyConfigured(), true, "Twenty on once env is set");
  assert.equal(twentyConfig()?.url, "https://crm.example.com", "trailing slash trimmed");
  process.env.PAPERMARK_API_KEY = "pm-key";
  assert.equal(isPapermarkConfigured(), true, "Papermark on once key is set");
  // Restore env so other tests/processes are unaffected.
  if (savedTwentyUrl === undefined) delete process.env.TWENTY_API_URL; else process.env.TWENTY_API_URL = savedTwentyUrl;
  if (savedTwentyKey === undefined) delete process.env.TWENTY_API_KEY; else process.env.TWENTY_API_KEY = savedTwentyKey;
  if (savedPmKey === undefined) delete process.env.PAPERMARK_API_KEY; else process.env.PAPERMARK_API_KEY = savedPmKey;

  // QR encoder (ShipNotify confirm codes) — structural + deterministic checks.
  const url = "https://shop.example.com/s/confirm/abc123DEF456ghi789";
  const matrix = qrMatrix(url);
  // Square, and a valid QR size (17 + 4*version).
  assert.equal(matrix.length, matrix[0].length, "QR matrix must be square");
  assert.equal((matrix.length - 17) % 4, 0, "QR size must be 17 + 4*version");
  assert.ok(matrix.length >= 21 && matrix.length <= 57, "QR version 1..10");
  // Finder pattern at top-left: solid 7-module border row + dark 3x3 center.
  for (let c = 0; c < 7; c += 1) {
    assert.equal(matrix[0][c], true, "finder top border dark");
    assert.equal(matrix[6][c], true, "finder bottom border dark");
  }
  assert.equal(matrix[1][1], false, "finder inner light ring");
  assert.equal(matrix[3][3], true, "finder center dark");
  // Deterministic: same input → identical matrix.
  assert.deepEqual(qrMatrix(url), matrix, "QR output is deterministic");
  // Longer payload selects an equal-or-larger version.
  const big = qrMatrix(url + "/" + "x".repeat(120));
  assert.ok(big.length >= matrix.length, "longer payload → larger QR");
  // SVG render is self-contained (no external refs) with a white backdrop.
  const svg = qrSvg(url, { scale: 4, margin: 4 });
  assert.ok(svg.startsWith("<svg"), "qrSvg returns an svg element");
  assert.ok(svg.includes("<rect") && svg.includes('fill="#ffffff"'), "svg has modules + backdrop");
  assert.ok(!svg.includes("http://") || svg.includes("www.w3.org"), "svg references no external host");
  // Overflow guard.
  assert.throws(() => qrMatrix("y".repeat(400)), /too long/, "payload over v10 capacity throws");

  // Global search — permission gating (no DB needed for this).
  const userModules = moduleKeysFor(["ticket:view"]);
  assert.ok(userModules.includes("tickets"), "ticket:view enables ticket search");
  assert.ok(!userModules.includes("customers"), "no erp:view → no customer search");
  assert.ok(!userModules.includes("users"), "no admin:manage → no employee search");
  const erpModules = moduleKeysFor(["erp:view", "quote:view"]);
  assert.ok(erpModules.includes("customers") && erpModules.includes("quotes"), "erp:view + quote:view enable those modules");
  assert.ok(!erpModules.includes("tickets"), "erp:view alone does not enable tickets");
  assert.equal(moduleKeysFor([]).length, 0, "no permissions → nothing searchable");

  // Caching: stable source hash + server-memory tier.
  assert.equal(stableHash({ a: 1, b: 2 }), stableHash({ b: 2, a: 1 }), "stableHash is key-order independent");
  assert.notEqual(stableHash({ a: 1 }), stableHash({ a: 2 }), "stableHash changes when a value changes");
  assert.equal(stableHash([1, 2, 3]), stableHash([1, 2, 3]), "stableHash is deterministic for arrays");
  let memoCalls = 0;
  const compute = async () => {
    memoCalls += 1;
    return memoCalls;
  };
  const m1 = await getMemo("test:memo", compute, 10_000);
  const m2 = await getMemo("test:memo", compute, 10_000);
  assert.equal(m1, 1);
  assert.equal(m2, 1);
  assert.equal(memoCalls, 1, "getMemo serves the cached value within TTL");
  await getMemo("test:memo-zero", compute, 0);
  await getMemo("test:memo-zero", compute, 0);
  assert.ok(memoCalls >= 3, "ttl 0 forces recompute each call");

  // Action Center rule helpers.
  const refNow = new Date("2026-06-18T12:00:00Z");
  assert.equal(isOverdue(new Date("2026-06-17T12:00:00Z"), refNow), true, "past due date is overdue");
  assert.equal(isOverdue(new Date("2026-06-19T12:00:00Z"), refNow), false, "future due date is not overdue");
  assert.equal(isOverdue(null, refNow), false, "no due date is not overdue");
  assert.equal(isLowStock(2, 5), true, "below reorder is low");
  assert.equal(isLowStock(5, 5), true, "at reorder is low");
  assert.equal(isLowStock(6, 5), false, "above reorder is fine");
  assert.equal(isLowStock(0, null), false, "no reorder point → never low");
  assert.ok(severityRank("critical") < severityRank("warning"), "critical sorts before warning");
  assert.ok(severityRank("warning") < severityRank("info"), "warning sorts before info");
  const sum = summarizeAlerts([
    { id: "a", severity: "critical", module: "Jobs", title: "x", href: "/", createdAt: "", suggestedAction: "" },
    { id: "b", severity: "warning", module: "Jobs", title: "y", href: "/", createdAt: "", suggestedAction: "" },
    { id: "c", severity: "warning", module: "Quality", title: "z", href: "/", createdAt: "", suggestedAction: "" }
  ]);
  assert.deepEqual(sum, { total: 3, critical: 1, warning: 2, info: 0 }, "summarizeAlerts counts by severity");
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
