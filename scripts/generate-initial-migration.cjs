const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const modelRe = /model\s+(\w+)\s+\{([\s\S]*?)\n\}/g;
const tables = [];
const fieldTypes = new Map();

let model;
while ((model = modelRe.exec(schema))) {
  const body = model[2];
  const mapped = body.match(/@@map\("([^"]+)"\)/);
  tables.push(mapped ? mapped[1] : model[1]);

  for (const line of body.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("@@") || trimmed.startsWith("//")) continue;
    const parts = trimmed.split(/\s+/);
    if (parts[0] && parts[1] && !parts[0].startsWith("@")) {
      fieldTypes.set(parts[0], parts[1].replace(/[?\[\]]/g, ""));
    }
  }
}

function sqlType(name, type) {
  if (name === "id") return "TEXT PRIMARY KEY";
  if (type === "DateTime") {
    return name === "createdAt" || name === "updatedAt" ? "TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP" : "TIMESTAMP(3)";
  }
  if (type === "Json") return "JSONB";
  if (type === "Int") return "INTEGER";
  if (type === "Decimal") return "DECIMAL(12,2)";
  if (type === "Boolean") return "BOOLEAN";
  if (["UserLevel", "EmploymentType", "VisibilityLevel", "RequestPriority", "ExportFormat"].includes(type)) return `"${type}"`;
  return "TEXT";
}

const columns = [...fieldTypes.entries()].map(([name, type]) => `  "${name}" ${sqlType(name, type)}`).join(",\n");
let sql = `-- Initial migration generated from prisma/schema.prisma for Railway deploy.
DO $$ BEGIN CREATE TYPE "UserLevel" AS ENUM ('LEVEL_1','MANAGER','DIRECTOR','GLOBAL_ADMIN'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EmploymentType" AS ENUM ('EMPLOYEE','CONTRACTOR','TEMP','INTERN','SEASONAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "VisibilityLevel" AS ENUM ('PRIVATE_TO_MANAGER','VISIBLE_TO_DIRECTOR','VISIBLE_TO_HR_ADMIN','VISIBLE_TO_EMPLOYEE','EXECUTIVE_RESTRICTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "RequestPriority" AS ENUM ('LOW','NORMAL','HIGH','URGENT','WORK_STOPPAGE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ExportFormat" AS ENUM ('PDF','DOCX','XLSX','CSV','MARKDOWN','HTML','JSON'); EXCEPTION WHEN duplicate_object THEN null; END $$;

`;

for (const table of tables) {
  sql += `CREATE TABLE IF NOT EXISTS "${table}" (\n${columns}\n);\n\n`;
}

const uniqueIndexes = [
  ["organizations", ["slug"]],
  ["users", ["organizationId", "email"]],
  ["roles", ["organizationId", "systemKey"]],
  ["permissions", ["organizationId", "key"]],
  ["user_roles", ["organizationId", "userId", "roleId"]],
  ["role_permissions", ["organizationId", "roleId", "permissionId"]],
  ["departments", ["organizationId", "code"]],
  ["locations", ["organizationId", "code"]],
  ["shifts", ["organizationId", "code"]],
  ["ticket_centers", ["organizationId", "slug"]],
  ["ticket_categories", ["organizationId", "ticketCenterId", "slug"]],
  ["tickets", ["organizationId", "ticketNumber"]],
  ["onboarding_cases", ["organizationId", "caseNumber"]],
  ["payroll_change_requests", ["organizationId", "requestNumber"]],
  ["payroll_exports", ["organizationId", "exportNumber"]],
  ["time_off_requests", ["organizationId", "requestNumber"]],
  ["attendance_issue_records", ["organizationId", "recordNumber"]],
  ["schedule_issue_records", ["organizationId", "recordNumber"]],
  ["time_correction_requests", ["organizationId", "requestNumber"]],
  ["employee_profiles", ["organizationId", "employeeNumber"]],
  ["role_change_requests", ["organizationId", "requestNumber"]],
  ["transfer_requests", ["organizationId", "requestNumber"]],
  ["rehire_requests", ["organizationId", "requestNumber"]],
  ["equipment_requests", ["organizationId", "requestNumber"]],
  ["supply_requests", ["organizationId", "requestNumber"]],
  ["software_coordination_requests", ["organizationId", "requestNumber"]],
  ["workspace_requests", ["organizationId", "requestNumber"]],
  ["badge_key_requests", ["organizationId", "requestNumber"]],
  ["training_assignments", ["organizationId", "assignmentNumber"]],
  ["approval_requests", ["organizationId", "requestNumber"]],
  ["reports", ["organizationId", "reportNumber"]],
  ["report_templates", ["organizationId", "reportType"]],
  ["settings", ["organizationId", "key"]]
];

for (const [table, cols] of uniqueIndexes) {
  sql += `CREATE UNIQUE INDEX IF NOT EXISTS "${table}_${cols.join("_")}_key" ON "${table}" (${cols.map((col) => `"${col}"`).join(", ")});\n`;
}

for (const table of tables) {
  sql += `CREATE INDEX IF NOT EXISTS "${table}_organizationId_idx" ON "${table}" ("organizationId");\n`;
}

const dir = path.join(root, "prisma/migrations/20260507093000_initial");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "migration.sql"), sql);
console.log(`Wrote ${path.relative(root, path.join(dir, "migration.sql"))}`);
