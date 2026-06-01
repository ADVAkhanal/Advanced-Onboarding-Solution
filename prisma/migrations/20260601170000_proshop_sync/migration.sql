-- ProShop sync (read-only mirror)
-- ProShop remains the system of record. These tables hold a local,
-- refreshable mirror of active work orders plus observable sync-run state,
-- so dashboards stay fast and survive ProShop downtime. Additive.

CREATE TABLE "proshop_work_order_refs" (
    "id"                 TEXT PRIMARY KEY,
    "organizationId"     TEXT NOT NULL,
    "source"             TEXT NOT NULL DEFAULT 'proshop',
    "externalNumber"     TEXT NOT NULL,
    "status"             TEXT,
    "customerName"       TEXT,
    "partNumber"         TEXT,
    "dueAt"              TIMESTAMP(3),
    "mustLeaveBy"        TIMESTAMP(3),
    "estValue"           DECIMAL(14, 2),
    "rawHash"            TEXT,
    "syncStatus"         TEXT NOT NULL DEFAULT 'synced',
    "syncedAt"           TIMESTAMP(3),
    "dataClassification" TEXT NOT NULL DEFAULT 'internal',
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "proshop_wo_refs_org_source_number_unique"
    ON "proshop_work_order_refs" ("organizationId", "source", "externalNumber");
CREATE INDEX "proshop_wo_refs_org_syncstatus_idx"
    ON "proshop_work_order_refs" ("organizationId", "syncStatus");
CREATE INDEX "proshop_wo_refs_org_dueat_idx"
    ON "proshop_work_order_refs" ("organizationId", "dueAt");

CREATE TABLE "proshop_sync_runs" (
    "id"              TEXT PRIMARY KEY,
    "organizationId"  TEXT NOT NULL,
    "module"          TEXT NOT NULL DEFAULT 'work_orders',
    "trigger"         TEXT NOT NULL DEFAULT 'manual',
    "status"          TEXT NOT NULL DEFAULT 'running',
    "recordsSeen"     INTEGER NOT NULL DEFAULT 0,
    "recordsUpserted" INTEGER NOT NULL DEFAULT 0,
    "recordsStale"    INTEGER NOT NULL DEFAULT 0,
    "error"           TEXT,
    "startedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"      TIMESTAMP(3),
    "triggeredById"   TEXT
);

CREATE INDEX "proshop_sync_runs_org_module_started_idx"
    ON "proshop_sync_runs" ("organizationId", "module", "startedAt");
