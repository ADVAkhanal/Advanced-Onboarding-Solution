-- Internal shop ERP core tables.
-- These records intentionally avoid payment-card, banking, full SSN, CUI, ITAR, medical, password, API-key, payroll credential, and formal compliance-evidence fields.

CREATE TABLE IF NOT EXISTS "customer_accounts" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "primaryContactName" TEXT,
  "primaryEmail" TEXT,
  "primaryPhone" TEXT,
  "billingCity" TEXT,
  "billingState" TEXT,
  "shippingCity" TEXT,
  "shippingState" TEXT,
  "ownerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "vendor_accounts" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "vendorNumber" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "primaryContactName" TEXT,
  "primaryEmail" TEXT,
  "primaryPhone" TEXT,
  "city" TEXT,
  "state" TEXT,
  "ownerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "parts" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "partNumber" TEXT NOT NULL,
  "revision" TEXT NOT NULL DEFAULT 'A',
  "description" TEXT NOT NULL,
  "customerId" TEXT,
  "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
  "makeBuy" TEXT NOT NULL DEFAULT 'MAKE',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "quotes" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "quoteNumber" TEXT NOT NULL,
  "customerId" TEXT,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
  "dueDate" TIMESTAMP(3),
  "estimatedValue" DECIMAL(12,2),
  "marginTarget" DECIMAL(5,2),
  "validUntil" TIMESTAMP(3),
  "ownerId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "quote_lines" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "partId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2),
  "estimatedHours" DECIMAL(12,2),
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "sales_orders" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "customerId" TEXT,
  "quoteId" TEXT,
  "customerPoNumber" TEXT,
  "promisedDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
  "ownerId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "work_orders" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "workOrderNumber" TEXT NOT NULL,
  "salesOrderId" TEXT,
  "customerId" TEXT,
  "partId" TEXT,
  "departmentId" TEXT,
  "title" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
  "releasedQuantity" DECIMAL(12,2),
  "dueDate" TIMESTAMP(3),
  "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "routerStatus" TEXT NOT NULL DEFAULT 'NOT_RELEASED',
  "materialStatus" TEXT NOT NULL DEFAULT 'NOT_ALLOCATED',
  "qualityStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "shippingStatus" TEXT NOT NULL DEFAULT 'NOT_READY',
  "ownerId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "work_order_operations" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "operationNumber" INTEGER NOT NULL,
  "workCenter" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "setupHours" DECIMAL(12,2),
  "runHours" DECIMAL(12,2),
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "scheduledStart" TIMESTAMP(3),
  "scheduledEnd" TIMESTAMP(3),
  "assignedToId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "shop_schedule_items" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "workOrderId" TEXT,
  "operationId" TEXT,
  "workCenter" TEXT NOT NULL,
  "scheduleDate" TIMESTAMP(3) NOT NULL,
  "startTime" TIMESTAMP(3),
  "endTime" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "inventory_items" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "itemNumber" TEXT NOT NULL,
  "partId" TEXT,
  "description" TEXT NOT NULL,
  "itemType" TEXT NOT NULL DEFAULT 'MATERIAL',
  "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
  "quantityOnHand" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "quantityAllocated" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "reorderPoint" DECIMAL(12,2),
  "locationCode" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "inventory_transactions" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "transactionType" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "poNumber" TEXT NOT NULL,
  "vendorId" TEXT,
  "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expectedDate" TIMESTAMP(3),
  "buyerId" TEXT,
  "totalAmount" DECIMAL(12,2),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "purchase_order_lines" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "inventoryItemId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
  "unitCost" DECIMAL(12,2),
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "receipts" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "purchaseOrderId" TEXT,
  "vendorId" TEXT,
  "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "shipments" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "shipmentNumber" TEXT NOT NULL,
  "customerId" TEXT,
  "salesOrderId" TEXT,
  "workOrderId" TEXT,
  "carrierName" TEXT,
  "trackingNumber" TEXT,
  "shipDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "quality_inspections" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "inspectionNumber" TEXT NOT NULL,
  "workOrderId" TEXT,
  "partId" TEXT,
  "inspectionType" TEXT NOT NULL,
  "result" TEXT,
  "inspectorId" TEXT,
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "nonconformance_records" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "ncrNumber" TEXT NOT NULL,
  "workOrderId" TEXT,
  "partId" TEXT,
  "title" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "disposition" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" "RequestPriority" NOT NULL DEFAULT 'HIGH',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "document_records" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "documentNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "revision" TEXT,
  "relatedType" TEXT,
  "relatedId" TEXT,
  "visibility" "VisibilityLevel" NOT NULL DEFAULT 'VISIBLE_TO_HR_ADMIN',
  "fileMetadataId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workOrderId" TEXT,
  "operationId" TEXT,
  "entryDate" TIMESTAMP(3) NOT NULL,
  "hours" DECIMAL(12,2) NOT NULL,
  "entryType" TEXT NOT NULL DEFAULT 'SHOP_FLOOR',
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "departmentId" TEXT,
  "ownerId" TEXT,
  "archivedAt" TIMESTAMP(3)
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_accounts_organizationId_accountNumber_key" ON "customer_accounts" ("organizationId", "accountNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_accounts_organizationId_vendorNumber_key" ON "vendor_accounts" ("organizationId", "vendorNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "parts_organizationId_partNumber_revision_key" ON "parts" ("organizationId", "partNumber", "revision");
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_organizationId_quoteNumber_key" ON "quotes" ("organizationId", "quoteNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "sales_orders_organizationId_orderNumber_key" ON "sales_orders" ("organizationId", "orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "work_orders_organizationId_workOrderNumber_key" ON "work_orders" ("organizationId", "workOrderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "work_order_operations_organizationId_workOrderId_operationNumber_key" ON "work_order_operations" ("organizationId", "workOrderId", "operationNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_organizationId_itemNumber_key" ON "inventory_items" ("organizationId", "itemNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_organizationId_poNumber_key" ON "purchase_orders" ("organizationId", "poNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_organizationId_receiptNumber_key" ON "receipts" ("organizationId", "receiptNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "shipments_organizationId_shipmentNumber_key" ON "shipments" ("organizationId", "shipmentNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "quality_inspections_organizationId_inspectionNumber_key" ON "quality_inspections" ("organizationId", "inspectionNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "nonconformance_records_organizationId_ncrNumber_key" ON "nonconformance_records" ("organizationId", "ncrNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "document_records_organizationId_documentNumber_key" ON "document_records" ("organizationId", "documentNumber");

CREATE INDEX IF NOT EXISTS "customer_accounts_organizationId_status_idx" ON "customer_accounts" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS "vendor_accounts_organizationId_status_idx" ON "vendor_accounts" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS "parts_organizationId_customerId_idx" ON "parts" ("organizationId", "customerId");
CREATE INDEX IF NOT EXISTS "quotes_organizationId_status_dueDate_idx" ON "quotes" ("organizationId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "quote_lines_organizationId_quoteId_idx" ON "quote_lines" ("organizationId", "quoteId");
CREATE INDEX IF NOT EXISTS "sales_orders_organizationId_status_promisedDate_idx" ON "sales_orders" ("organizationId", "status", "promisedDate");
CREATE INDEX IF NOT EXISTS "work_orders_organizationId_departmentId_status_idx" ON "work_orders" ("organizationId", "departmentId", "status");
CREATE INDEX IF NOT EXISTS "work_orders_organizationId_dueDate_idx" ON "work_orders" ("organizationId", "dueDate");
CREATE INDEX IF NOT EXISTS "work_order_operations_organizationId_workCenter_status_idx" ON "work_order_operations" ("organizationId", "workCenter", "status");
CREATE INDEX IF NOT EXISTS "shop_schedule_items_organizationId_scheduleDate_workCenter_idx" ON "shop_schedule_items" ("organizationId", "scheduleDate", "workCenter");
CREATE INDEX IF NOT EXISTS "inventory_items_organizationId_status_locationCode_idx" ON "inventory_items" ("organizationId", "status", "locationCode");
CREATE INDEX IF NOT EXISTS "inventory_transactions_organizationId_inventoryItemId_createdAt_idx" ON "inventory_transactions" ("organizationId", "inventoryItemId", "createdAt");
CREATE INDEX IF NOT EXISTS "purchase_orders_organizationId_status_expectedDate_idx" ON "purchase_orders" ("organizationId", "status", "expectedDate");
CREATE INDEX IF NOT EXISTS "purchase_order_lines_organizationId_purchaseOrderId_idx" ON "purchase_order_lines" ("organizationId", "purchaseOrderId");
CREATE INDEX IF NOT EXISTS "receipts_organizationId_status_receivedDate_idx" ON "receipts" ("organizationId", "status", "receivedDate");
CREATE INDEX IF NOT EXISTS "shipments_organizationId_status_shipDate_idx" ON "shipments" ("organizationId", "status", "shipDate");
CREATE INDEX IF NOT EXISTS "quality_inspections_organizationId_status_dueDate_idx" ON "quality_inspections" ("organizationId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "nonconformance_records_organizationId_status_severity_idx" ON "nonconformance_records" ("organizationId", "status", "severity");
CREATE INDEX IF NOT EXISTS "document_records_organizationId_relatedType_relatedId_idx" ON "document_records" ("organizationId", "relatedType", "relatedId");
CREATE INDEX IF NOT EXISTS "time_entries_organizationId_userId_entryDate_idx" ON "time_entries" ("organizationId", "userId", "entryDate");
CREATE INDEX IF NOT EXISTS "time_entries_organizationId_workOrderId_idx" ON "time_entries" ("organizationId", "workOrderId");
