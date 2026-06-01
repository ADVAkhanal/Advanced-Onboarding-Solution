-- Work-order operation actuals
-- Captures real setup/run hours and completed quantity when an operation
-- is completed, so completion can auto-derive a JobActual and refresh the
-- matching cycle-time estimate. All columns nullable — additive, non-breaking.

ALTER TABLE "work_order_operations"
    ADD COLUMN "actualSetupHours"  DECIMAL(12, 2),
    ADD COLUMN "actualRunHours"    DECIMAL(12, 2),
    ADD COLUMN "completedQuantity" DECIMAL(12, 2),
    ADD COLUMN "completedAt"       TIMESTAMP(3);
