-- Job actuals feedback loop
-- Records how long completed jobs actually took, bucketed by the same
-- (material, process, complexity, diameter) key as cycle_time_lookups.
-- Recording an actual recomputes the matching lookup so estimates improve
-- from this shop's own history. See docs/quoting-engine.md.

-- CYCLE TIME LOOKUP: provenance --------------------------------------------
-- SEED / MANUAL / DERIVED. Existing rows default to MANUAL; the demo seed
-- sets SEED explicitly.
ALTER TABLE "cycle_time_lookups"
    ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- JOB ACTUALS --------------------------------------------------------------
-- Append-only. No UPDATE path in the application; corrections supersede.
CREATE TABLE "job_actuals" (
    "id"                         TEXT PRIMARY KEY,
    "organizationId"             TEXT NOT NULL,
    "partId"                     TEXT,
    "workOrderId"                TEXT,
    "materialCategory"           "MaterialCategory" NOT NULL,
    "process"                    "ManufacturingProcess" NOT NULL,
    "complexityClass"            "ComplexityClass" NOT NULL,
    "diameterClass"              "DiameterClass" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "quantity"                   INTEGER NOT NULL,
    "actualSetupHours"           DECIMAL(8, 2) NOT NULL,
    "actualCycleMinutesPerPiece" DECIMAL(8, 3) NOT NULL,
    "completedAt"                TIMESTAMP(3) NOT NULL,
    "notes"                      TEXT,
    "excludedFromAggregation"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById"                TEXT,
    "archivedAt"                 TIMESTAMP(3)
);

CREATE INDEX "job_actuals_bucket_idx"
    ON "job_actuals" ("organizationId", "materialCategory", "process", "complexityClass", "diameterClass");

CREATE INDEX "job_actuals_org_completed_idx"
    ON "job_actuals" ("organizationId", "completedAt");

CREATE INDEX "job_actuals_org_workorder_idx"
    ON "job_actuals" ("organizationId", "workOrderId");
