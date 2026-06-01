-- Work center capacity
-- One row per work center with a weekly capacity figure. The free-text
-- work_order_operations.workCenter joins to work_centers.code so the
-- Advanced Capacity dashboard can compute real load-vs-capacity utilization.
-- Additive; no existing data touched.

CREATE TABLE "work_centers" (
    "id"                   TEXT PRIMARY KEY,
    "organizationId"       TEXT NOT NULL,
    "code"                 TEXT NOT NULL,
    "name"                 TEXT,
    "capacityHoursPerWeek" DECIMAL(8, 2) NOT NULL DEFAULT 40,
    "status"               TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes"                TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,
    "createdById"          TEXT,
    "updatedById"          TEXT,
    "archivedAt"           TIMESTAMP(3)
);

CREATE UNIQUE INDEX "work_centers_org_code_unique" ON "work_centers" ("organizationId", "code");
CREATE INDEX "work_centers_org_status_idx" ON "work_centers" ("organizationId", "status");
