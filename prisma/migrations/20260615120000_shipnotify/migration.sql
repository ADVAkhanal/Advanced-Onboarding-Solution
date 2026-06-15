-- ShipNotify: recipient confirmation loop on shipments.
ALTER TABLE "shipments" ADD COLUMN "recipientName" TEXT;
ALTER TABLE "shipments" ADD COLUMN "recipientEmail" TEXT;
ALTER TABLE "shipments" ADD COLUMN "confirmToken" TEXT;
ALTER TABLE "shipments" ADD COLUMN "notifiedAt" TIMESTAMP(3);
ALTER TABLE "shipments" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "shipments" ADD COLUMN "confirmedByName" TEXT;

-- Opaque public confirm token is unique (NULLs remain distinct in Postgres).
CREATE UNIQUE INDEX "shipments_confirmToken_key" ON "shipments"("confirmToken");
