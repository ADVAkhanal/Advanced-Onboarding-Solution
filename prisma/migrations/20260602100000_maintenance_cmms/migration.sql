-- Maintenance / CMMS module (reimagines the standalone "Maintenance Command" app)
-- Equipment asset register, preventive-maintenance schedule, maintenance work
-- orders, MRO parts/supplies, and downtime log. Additive — no changes to
-- existing tables. Operational metadata only.

CREATE TABLE "machines" (
    "id"             TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "code"           TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "category"       TEXT NOT NULL DEFAULT 'Support',
    "building"       INTEGER,
    "status"         TEXT NOT NULL DEFAULT 'running',
    "manufacturer"   TEXT,
    "serial"         TEXT,
    "envelope"       TEXT,
    "footprint"      TEXT,
    "installDate"    TIMESTAMP(3),
    "serviceHours"   INTEGER NOT NULL DEFAULT 0,
    "location"       TEXT,
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "createdById"    TEXT,
    "updatedById"    TEXT,
    "departmentId"   TEXT,
    "ownerId"        TEXT,
    "archivedAt"     TIMESTAMP(3)
);

CREATE UNIQUE INDEX "machines_org_code_unique" ON "machines" ("organizationId", "code");
CREATE INDEX "machines_org_status_idx" ON "machines" ("organizationId", "status");
CREATE INDEX "machines_org_category_idx" ON "machines" ("organizationId", "category");

CREATE TABLE "maintenance_work_orders" (
    "id"              TEXT PRIMARY KEY,
    "organizationId"  TEXT NOT NULL,
    "woNumber"        TEXT NOT NULL,
    "machineId"       TEXT,
    "title"           TEXT NOT NULL,
    "description"     TEXT,
    "priority"        "RequestPriority" NOT NULL DEFAULT 'NORMAL',
    "status"          TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedByName" TEXT,
    "requestedByDept" TEXT,
    "assignee"        TEXT,
    "dueDate"         TIMESTAMP(3),
    "source"          TEXT NOT NULL DEFAULT 'internal',
    "closedAt"        TIMESTAMP(3),
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "createdById"     TEXT,
    "updatedById"     TEXT,
    "departmentId"    TEXT,
    "ownerId"         TEXT,
    "archivedAt"      TIMESTAMP(3)
);

CREATE UNIQUE INDEX "maint_wo_org_number_unique" ON "maintenance_work_orders" ("organizationId", "woNumber");
CREATE INDEX "maint_wo_org_status_idx" ON "maintenance_work_orders" ("organizationId", "status");
CREATE INDEX "maint_wo_org_machine_idx" ON "maintenance_work_orders" ("organizationId", "machineId");

CREATE TABLE "pm_tasks" (
    "id"             TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "machineId"      TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "frequency"      TEXT NOT NULL DEFAULT 'monthly',
    "estMinutes"     INTEGER NOT NULL DEFAULT 30,
    "nextDueAt"      TIMESTAMP(3),
    "lastDoneAt"     TIMESTAMP(3),
    "status"         TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "createdById"    TEXT,
    "updatedById"    TEXT,
    "departmentId"   TEXT,
    "ownerId"        TEXT,
    "archivedAt"     TIMESTAMP(3)
);

CREATE INDEX "pm_tasks_org_machine_idx" ON "pm_tasks" ("organizationId", "machineId");
CREATE INDEX "pm_tasks_org_nextdue_idx" ON "pm_tasks" ("organizationId", "nextDueAt");

CREATE TABLE "pm_completions" (
    "id"             TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "pmTaskId"       TEXT NOT NULL,
    "machineId"      TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "completedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedById"  TEXT,
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departmentId"   TEXT,
    "ownerId"        TEXT,
    "archivedAt"     TIMESTAMP(3)
);

CREATE INDEX "pm_completions_org_machine_completed_idx" ON "pm_completions" ("organizationId", "machineId", "completedAt");
CREATE INDEX "pm_completions_org_pmtask_idx" ON "pm_completions" ("organizationId", "pmTaskId");

CREATE TABLE "maintenance_parts" (
    "id"             TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "category"       TEXT,
    "subCategory"    TEXT,
    "unit"           TEXT NOT NULL DEFAULT 'each',
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint"   INTEGER NOT NULL DEFAULT 0,
    "critical"       BOOLEAN NOT NULL DEFAULT false,
    "location"       TEXT,
    "vendor"         TEXT,
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "createdById"    TEXT,
    "updatedById"    TEXT,
    "departmentId"   TEXT,
    "ownerId"        TEXT,
    "archivedAt"     TIMESTAMP(3)
);

CREATE INDEX "maint_parts_org_category_idx" ON "maintenance_parts" ("organizationId", "category");
CREATE INDEX "maint_parts_org_critical_idx" ON "maintenance_parts" ("organizationId", "critical");

CREATE TABLE "maintenance_downtime_events" (
    "id"             TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "machineId"      TEXT NOT NULL,
    "startAt"        TIMESTAMP(3) NOT NULL,
    "hours"          DECIMAL(8, 2),
    "reason"         TEXT,
    "rootCause"      TEXT,
    "resolution"     TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "createdById"    TEXT,
    "updatedById"    TEXT,
    "departmentId"   TEXT,
    "ownerId"        TEXT,
    "archivedAt"     TIMESTAMP(3)
);

CREATE INDEX "maint_downtime_org_machine_start_idx" ON "maintenance_downtime_events" ("organizationId", "machineId", "startAt");
