import assert from "node:assert/strict";
import { can, permissionsForLevel } from "../src/lib/permissions";
import { GET as healthGet } from "../src/app/api/health/route";
import { redactProhibited } from "../src/lib/ai/redaction";
import { chunkSopText } from "../src/lib/ai/chunker";
import { __testHooks } from "../src/lib/ai/sop-answerer";

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
