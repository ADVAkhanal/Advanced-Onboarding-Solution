-- Quoting engine: manufacturing-aware schema
-- Adds broad material / process / complexity / diameter categories so the
-- estimator can look up historical cycle times without needing CUI alloy
-- specs or controlled drawings on the platform. See docs/data-scope-boundary.md.

-- ENUMS ----------------------------------------------------------------------

CREATE TYPE "MaterialCategory" AS ENUM (
    'ALLOY_STEEL',
    'STAINLESS_STEEL',
    'CARBON_STEEL',
    'ALUMINUM',
    'TITANIUM',
    'BRASS',
    'COPPER',
    'NICKEL_ALLOY',
    'PLASTIC',
    'COMPOSITE',
    'OTHER'
);

CREATE TYPE "ManufacturingProcess" AS ENUM (
    'TURNING',
    'MILLING',
    'MULTI_SPINDLE',
    'SWISS_TURNING',
    'GRINDING',
    'EDM',
    'WIRE_EDM',
    'HONING',
    'LAPPING',
    'INSPECTION',
    'ASSEMBLY',
    'OTHER'
);

CREATE TYPE "ComplexityClass" AS ENUM (
    'SIMPLE',
    'MODERATE',
    'COMPLEX',
    'HIGHLY_COMPLEX'
);

CREATE TYPE "DiameterClass" AS ENUM (
    'UNDER_25_MM',
    'FROM_25_TO_75_MM',
    'FROM_75_TO_150_MM',
    'FROM_150_TO_300_MM',
    'OVER_300_MM',
    'NOT_APPLICABLE'
);

-- PART EXTENSIONS ------------------------------------------------------------
-- All new columns are nullable so the migration is non-breaking for any row
-- that already exists.

ALTER TABLE "parts"
    ADD COLUMN "materialCategory"  "MaterialCategory",
    ADD COLUMN "primaryProcess"    "ManufacturingProcess",
    ADD COLUMN "complexityClass"   "ComplexityClass",
    ADD COLUMN "diameterClass"     "DiameterClass",
    ADD COLUMN "exportControlFlag" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "parts_org_material_process_idx"
    ON "parts" ("organizationId", "materialCategory", "primaryProcess");

-- QUOTE LINE EXTENSIONS ------------------------------------------------------

ALTER TABLE "quote_lines"
    ADD COLUMN "materialCategory"     "MaterialCategory",
    ADD COLUMN "process"              "ManufacturingProcess",
    ADD COLUMN "complexityClass"      "ComplexityClass",
    ADD COLUMN "diameterClass"        "DiameterClass",
    ADD COLUMN "setupHours"           DECIMAL(8, 2),
    ADD COLUMN "cycleMinutesPerPiece" DECIMAL(8, 3),
    ADD COLUMN "materialCostPerUnit"  DECIMAL(12, 4),
    ADD COLUMN "laborRatePerHour"     DECIMAL(8, 2),
    ADD COLUMN "burdenRatePerHour"    DECIMAL(8, 2),
    ADD COLUMN "marginPercent"        DECIMAL(5, 2),
    ADD COLUMN "cycleTimeLookupId"    TEXT,
    ADD COLUMN "routingNotes"         TEXT;

CREATE INDEX "quote_lines_org_lookup_idx"
    ON "quote_lines" ("organizationId", "cycleTimeLookupId");

-- CYCLE TIME LOOKUP ----------------------------------------------------------
-- Bucketed historical estimates. One row per
-- (org, material, process, complexity, diameterClass) combination.

CREATE TABLE "cycle_time_lookups" (
    "id"                    TEXT PRIMARY KEY,
    "organizationId"        TEXT NOT NULL,
    "materialCategory"      "MaterialCategory" NOT NULL,
    "process"               "ManufacturingProcess" NOT NULL,
    "complexityClass"       "ComplexityClass" NOT NULL,
    "diameterClass"         "DiameterClass" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "estimatedSetupHours"   DECIMAL(8, 2) NOT NULL,
    "estimatedCycleMinutes" DECIMAL(8, 3) NOT NULL,
    "sampleSize"            INTEGER NOT NULL DEFAULT 0,
    "confidenceScore"       DECIMAL(3, 2),
    "lastReviewedAt"        TIMESTAMP(3),
    "reviewedById"          TEXT,
    "notes"                 TEXT,
    "status"                TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    "createdById"           TEXT,
    "updatedById"           TEXT,
    "archivedAt"            TIMESTAMP(3)
);

CREATE UNIQUE INDEX "cycle_time_lookups_bucket_unique"
    ON "cycle_time_lookups"
    ("organizationId", "materialCategory", "process", "complexityClass", "diameterClass");

CREATE INDEX "cycle_time_lookups_org_status_idx"
    ON "cycle_time_lookups" ("organizationId", "status");
