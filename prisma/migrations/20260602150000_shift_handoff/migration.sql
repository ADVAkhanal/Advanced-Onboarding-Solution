-- Shift Handoff module (reimagines ADVAkhanal/Shift-Handoff).
-- End-of-shift handoff records with per-machine entries. Additive.

CREATE TABLE "shift_handoffs" (
    "id"              TEXT PRIMARY KEY,
    "organizationId"  TEXT NOT NULL,
    "shift"           TEXT NOT NULL,
    "shiftDate"       TIMESTAMP(3) NOT NULL,
    "operators"       TEXT,
    "notes"           TEXT,
    "submittedByName" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "createdById"     TEXT,
    "updatedById"     TEXT,
    "departmentId"    TEXT,
    "ownerId"         TEXT,
    "archivedAt"      TIMESTAMP(3)
);

CREATE INDEX "shift_handoffs_org_date_idx" ON "shift_handoffs" ("organizationId", "shiftDate");
CREATE INDEX "shift_handoffs_org_shift_date_idx" ON "shift_handoffs" ("organizationId", "shift", "shiftDate");

CREATE TABLE "shift_handoff_entries" (
    "id"             TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "handoffId"      TEXT NOT NULL,
    "machineCode"    TEXT NOT NULL,
    "woNumber"       TEXT,
    "status"         TEXT NOT NULL DEFAULT 'RUNNING',
    "partsMade"      INTEGER,
    "partsTarget"    INTEGER,
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departmentId"   TEXT,
    "ownerId"        TEXT,
    "archivedAt"     TIMESTAMP(3)
);

CREATE INDEX "shift_handoff_entries_org_handoff_idx" ON "shift_handoff_entries" ("organizationId", "handoffId");
CREATE INDEX "shift_handoff_entries_org_machine_idx" ON "shift_handoff_entries" ("organizationId", "machineCode");
