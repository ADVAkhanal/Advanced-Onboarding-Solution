-- CRM bridge — local mirror of customer/proposal requests pushed to Twenty CRM,
-- with Papermark proposal-share analytics fed back. Additive. See ADR 0001.

CREATE TABLE "crm_requests" (
    "id"                  TEXT PRIMARY KEY,
    "organizationId"      TEXT NOT NULL,
    "requestType"         TEXT NOT NULL DEFAULT 'customer',
    "contactName"         TEXT NOT NULL,
    "companyName"         TEXT,
    "email"               TEXT,
    "phone"               TEXT,
    "title"               TEXT NOT NULL,
    "summary"             TEXT,
    "estValue"            DECIMAL(14, 2),
    "status"              TEXT NOT NULL DEFAULT 'NEW',
    "twentyPersonId"      TEXT,
    "twentyOpportunityId" TEXT,
    "papermarkDocumentId" TEXT,
    "papermarkLinkId"     TEXT,
    "proposalUrl"         TEXT,
    "proposalViews"       INTEGER NOT NULL DEFAULT 0,
    "proposalDownloads"   INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt"        TIMESTAMP(3),
    "syncError"           TEXT,
    "notes"               TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    "createdById"         TEXT,
    "updatedById"         TEXT,
    "departmentId"        TEXT,
    "ownerId"             TEXT,
    "archivedAt"          TIMESTAMP(3)
);

CREATE INDEX "crm_requests_org_status_idx" ON "crm_requests" ("organizationId", "status");
CREATE INDEX "crm_requests_org_type_created_idx" ON "crm_requests" ("organizationId", "requestType", "createdAt");
