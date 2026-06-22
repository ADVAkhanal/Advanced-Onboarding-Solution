-- Operations Hub: per-feature cost attribution for AI summaries on the
-- existing AI action log (no parallel ai_usage_events table).
ALTER TABLE "ai_action_log" ADD COLUMN "entityType" TEXT;
ALTER TABLE "ai_action_log" ADD COLUMN "entityId" TEXT;
ALTER TABLE "ai_action_log" ADD COLUMN "estimatedCostCents" INTEGER;
