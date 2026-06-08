-- First-Piece / NPI live run tracker (reimagines the "NPI LIVE" + "First Pass
-- Yield Tracker" apps). Shop-floor log of first-article / prove-out runs.
-- Additive — operational metadata only.

CREATE TABLE "first_piece_runs" (
    "id"               TEXT PRIMARY KEY,
    "organizationId"   TEXT NOT NULL,
    "wo"               TEXT NOT NULL,
    "partNumber"       TEXT,
    "customer"         TEXT,
    "workCenter"       TEXT,
    "runNumber"        INTEGER,
    "opNumber"         TEXT,
    "inspectionMethod" TEXT,
    "setupTech"        TEXT,
    "status"           TEXT NOT NULL DEFAULT 'On Cycle',
    "result"           TEXT,
    "defectCode"       TEXT,
    "dmaxLab"          TEXT,
    "opStartDate"      TIMESTAMP(3),
    "detail"           TEXT,
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "createdById"      TEXT,
    "updatedById"      TEXT,
    "departmentId"     TEXT,
    "ownerId"          TEXT,
    "archivedAt"       TIMESTAMP(3)
);

CREATE INDEX "first_piece_runs_org_result_idx" ON "first_piece_runs" ("organizationId", "result");
CREATE INDEX "first_piece_runs_org_opstart_idx" ON "first_piece_runs" ("organizationId", "opStartDate");
CREATE INDEX "first_piece_runs_org_wc_idx" ON "first_piece_runs" ("organizationId", "workCenter");
