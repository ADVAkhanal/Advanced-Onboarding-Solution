import assert from "node:assert/strict";
import { can, permissionsForLevel } from "../src/lib/permissions";
import { GET as healthGet } from "../src/app/api/health/route";

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
