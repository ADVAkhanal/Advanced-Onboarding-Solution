-- Operations Hub cache: database-backed computed snapshots.
CREATE TABLE "computed_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "snapshotKey" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "dataJson" JSONB NOT NULL,
    "sourceHash" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "computed_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "computed_snapshots_organizationId_snapshotKey_key" ON "computed_snapshots"("organizationId", "snapshotKey");
CREATE INDEX "computed_snapshots_organizationId_entityType_entityId_idx" ON "computed_snapshots"("organizationId", "entityType", "entityId");
CREATE INDEX "computed_snapshots_organizationId_expiresAt_idx" ON "computed_snapshots"("organizationId", "expiresAt");
