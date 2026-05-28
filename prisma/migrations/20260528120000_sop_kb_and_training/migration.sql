-- SOP Knowledge Base + Training Assessments + AI Action Log
-- See docs/sop-knowledge-base.md and docs/training-module.md

-- ENUMS ----------------------------------------------------------------------
CREATE TYPE "SopApprovalStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SUPERSEDED', 'REJECTED');
CREATE TYPE "SopVisibility" AS ENUM ('ALL_USERS', 'DEPARTMENT', 'MANAGER_PLUS', 'DIRECTOR_PLUS', 'ADMIN_ONLY');
CREATE TYPE "SopQueryOutcome" AS ENUM ('ANSWERED', 'REFUSED', 'ESCALATED', 'PROVIDER_ERROR', 'REJECTED_BY_FILTER');
CREATE TYPE "SopEscalationStatus" AS ENUM ('OPEN', 'ASSIGNED', 'RESOLVED_ANSWERED', 'RESOLVED_SOP_DRAFTED', 'RESOLVED_NO_ACTION', 'REASSIGNED');
CREATE TYPE "QuizStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "QuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'PASSED', 'FAILED', 'ABANDONED', 'EXPIRED');

-- SOP DOCUMENTS --------------------------------------------------------------
CREATE TABLE "sop_documents" (
    "id"                TEXT PRIMARY KEY,
    "organizationId"    TEXT NOT NULL,
    "documentKey"       TEXT NOT NULL,
    "title"             TEXT NOT NULL,
    "category"          TEXT,
    "departmentId"      TEXT,
    "visibility"        "SopVisibility" NOT NULL DEFAULT 'ALL_USERS',
    "safetyCritical"    BOOLEAN NOT NULL DEFAULT false,
    "qualityCritical"   BOOLEAN NOT NULL DEFAULT false,
    "customerImpacting" BOOLEAN NOT NULL DEFAULT false,
    "ownerId"           TEXT,
    "summary"           TEXT,
    "status"            TEXT NOT NULL DEFAULT 'ACTIVE',
    "archivedAt"        TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    "createdById"       TEXT,
    "updatedById"       TEXT
);
CREATE UNIQUE INDEX "sop_documents_organizationId_documentKey_key" ON "sop_documents"("organizationId", "documentKey");
CREATE INDEX "sop_documents_organizationId_departmentId_visibility_idx" ON "sop_documents"("organizationId", "departmentId", "visibility");

-- SOP DOCUMENT VERSIONS ------------------------------------------------------
CREATE TABLE "sop_document_versions" (
    "id"               TEXT PRIMARY KEY,
    "organizationId"   TEXT NOT NULL,
    "documentId"       TEXT NOT NULL,
    "versionNumber"    INTEGER NOT NULL,
    "approvalStatus"   "SopApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "rawText"          TEXT NOT NULL,
    "changeSummary"    TEXT,
    "approvedById"     TEXT,
    "approvedAt"       TIMESTAMP(3),
    "rejectedById"     TEXT,
    "rejectedAt"       TIMESTAMP(3),
    "rejectionReason"  TEXT,
    "supersededAt"     TIMESTAMP(3),
    "supersededById"   TEXT,
    "archivedAt"       TIMESTAMP(3),
    "departmentId"     TEXT,
    "ownerId"          TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "createdById"      TEXT,
    "updatedById"      TEXT
);
CREATE UNIQUE INDEX "sop_document_versions_org_doc_version_key" ON "sop_document_versions"("organizationId", "documentId", "versionNumber");
CREATE INDEX "sop_document_versions_org_doc_status_idx" ON "sop_document_versions"("organizationId", "documentId", "approvalStatus");

-- SOP CHUNKS -----------------------------------------------------------------
CREATE TABLE "sop_chunks" (
    "id"               TEXT PRIMARY KEY,
    "organizationId"   TEXT NOT NULL,
    "documentId"       TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "chunkIndex"       INTEGER NOT NULL,
    "headingPath"      TEXT,
    "content"          TEXT NOT NULL,
    "tokenCount"       INTEGER NOT NULL DEFAULT 0,
    "embedding"        JSONB,
    "searchVector"     tsvector,
    "departmentId"     TEXT,
    "ownerId"          TEXT,
    "archivedAt"       TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "createdById"      TEXT,
    "updatedById"      TEXT
);
CREATE UNIQUE INDEX "sop_chunks_org_version_index_key" ON "sop_chunks"("organizationId", "documentVersionId", "chunkIndex");
CREATE INDEX "sop_chunks_org_doc_idx" ON "sop_chunks"("organizationId", "documentId");
CREATE INDEX "sop_chunks_org_version_idx" ON "sop_chunks"("organizationId", "documentVersionId");
CREATE INDEX "sop_chunks_search_vector_idx" ON "sop_chunks" USING GIN ("searchVector");

CREATE FUNCTION sop_chunk_tsvector_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('english', coalesce(NEW."headingPath", '') || ' ' || coalesce(NEW.content, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER sop_chunk_tsvector_update
BEFORE INSERT OR UPDATE ON "sop_chunks"
FOR EACH ROW EXECUTE FUNCTION sop_chunk_tsvector_trigger();

-- SOP APPROVALS --------------------------------------------------------------
CREATE TABLE "sop_approvals" (
    "id"                TEXT PRIMARY KEY,
    "organizationId"    TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "approverId"        TEXT NOT NULL,
    "decision"          TEXT NOT NULL,
    "reason"            TEXT,
    "decidedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departmentId"      TEXT,
    "ownerId"           TEXT,
    "archivedAt"        TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    "createdById"       TEXT,
    "updatedById"       TEXT
);
CREATE INDEX "sop_approvals_org_version_idx" ON "sop_approvals"("organizationId", "documentVersionId");

-- SOP QUERIES ----------------------------------------------------------------
CREATE TABLE "sop_queries" (
    "id"                TEXT PRIMARY KEY,
    "organizationId"    TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "departmentId"      TEXT,
    "questionRedacted"  TEXT NOT NULL,
    "questionHash"      TEXT NOT NULL,
    "retrievedChunkIds" JSONB NOT NULL,
    "topScore"          DOUBLE PRECISION,
    "modelUsed"         TEXT,
    "outcome"           "SopQueryOutcome" NOT NULL,
    "confidence"        DOUBLE PRECISION,
    "answerShown"       TEXT,
    "triggers"          JSONB,
    "inputTokens"       INTEGER,
    "outputTokens"      INTEGER,
    "cacheReadTokens"   INTEGER,
    "errorMessage"      TEXT,
    "ownerId"           TEXT,
    "archivedAt"        TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    "createdById"       TEXT,
    "updatedById"       TEXT
);
CREATE INDEX "sop_queries_org_user_created_idx" ON "sop_queries"("organizationId", "userId", "createdAt");
CREATE INDEX "sop_queries_org_outcome_created_idx" ON "sop_queries"("organizationId", "outcome", "createdAt");

-- SOP CITATIONS --------------------------------------------------------------
CREATE TABLE "sop_citations" (
    "id"             TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "queryId"        TEXT NOT NULL,
    "chunkId"        TEXT NOT NULL,
    "documentId"     TEXT NOT NULL,
    "rank"           INTEGER NOT NULL,
    "supports"       TEXT,
    "departmentId"   TEXT,
    "ownerId"        TEXT,
    "archivedAt"     TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "createdById"    TEXT,
    "updatedById"    TEXT
);
CREATE INDEX "sop_citations_org_query_idx" ON "sop_citations"("organizationId", "queryId");
CREATE INDEX "sop_citations_org_chunk_idx" ON "sop_citations"("organizationId", "chunkId");

-- SOP ESCALATIONS ------------------------------------------------------------
CREATE TABLE "sop_escalations" (
    "id"               TEXT PRIMARY KEY,
    "organizationId"   TEXT NOT NULL,
    "queryId"          TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "departmentId"     TEXT,
    "routedToUserId"   TEXT,
    "reasonSummary"    TEXT NOT NULL,
    "triggers"         JSONB NOT NULL,
    "status"           "SopEscalationStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById"     TEXT,
    "resolvedAt"       TIMESTAMP(3),
    "resolutionType"   TEXT,
    "resolutionNotes"  TEXT,
    "draftDocumentId"  TEXT,
    "ownerId"          TEXT,
    "archivedAt"       TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "createdById"      TEXT,
    "updatedById"      TEXT
);
CREATE UNIQUE INDEX "sop_escalations_org_query_key" ON "sop_escalations"("organizationId", "queryId");
CREATE INDEX "sop_escalations_org_routed_status_idx" ON "sop_escalations"("organizationId", "routedToUserId", "status");
CREATE INDEX "sop_escalations_org_status_created_idx" ON "sop_escalations"("organizationId", "status", "createdAt");

-- AI ACTION LOG --------------------------------------------------------------
CREATE TABLE "ai_action_log" (
    "id"               TEXT PRIMARY KEY,
    "organizationId"   TEXT NOT NULL,
    "actorId"          TEXT,
    "action"           TEXT NOT NULL,
    "provider"         TEXT NOT NULL,
    "model"            TEXT NOT NULL,
    "promptClass"      TEXT NOT NULL,
    "inputTokens"      INTEGER NOT NULL DEFAULT 0,
    "outputTokens"     INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens"  INTEGER NOT NULL DEFAULT 0,
    "redactionApplied" JSONB,
    "citationCount"    INTEGER NOT NULL DEFAULT 0,
    "confidence"       DOUBLE PRECISION,
    "outcome"          TEXT NOT NULL,
    "requestId"        TEXT,
    "errorMessage"     TEXT,
    "departmentId"     TEXT,
    "ownerId"          TEXT,
    "archivedAt"       TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "createdById"      TEXT,
    "updatedById"      TEXT
);
CREATE INDEX "ai_action_log_org_action_created_idx" ON "ai_action_log"("organizationId", "action", "createdAt");
CREATE INDEX "ai_action_log_org_actor_created_idx" ON "ai_action_log"("organizationId", "actorId", "createdAt");

-- QUESTION BANK CATEGORIES ---------------------------------------------------
CREATE TABLE "question_bank_categories" (
    "id"             TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "slug"           TEXT NOT NULL,
    "description"    TEXT,
    "departmentId"   TEXT,
    "ownerId"        TEXT,
    "active"         BOOLEAN NOT NULL DEFAULT true,
    "archivedAt"     TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "createdById"    TEXT,
    "updatedById"    TEXT
);
CREATE UNIQUE INDEX "question_bank_categories_org_slug_key" ON "question_bank_categories"("organizationId", "slug");
CREATE INDEX "question_bank_categories_org_dept_idx" ON "question_bank_categories"("organizationId", "departmentId");

-- QUIZ QUESTIONS -------------------------------------------------------------
CREATE TABLE "quiz_questions" (
    "id"              TEXT PRIMARY KEY,
    "organizationId"  TEXT NOT NULL,
    "categoryId"      TEXT,
    "departmentId"    TEXT,
    "prompt"          TEXT NOT NULL,
    "explanation"     TEXT,
    "difficulty"      TEXT NOT NULL DEFAULT 'normal',
    "tags"            JSONB,
    "safetyCritical"  BOOLEAN NOT NULL DEFAULT false,
    "qualityCritical" BOOLEAN NOT NULL DEFAULT false,
    "active"          BOOLEAN NOT NULL DEFAULT true,
    "archivedAt"      TIMESTAMP(3),
    "ownerId"         TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "createdById"     TEXT,
    "updatedById"     TEXT
);
CREATE INDEX "quiz_questions_org_category_idx" ON "quiz_questions"("organizationId", "categoryId");
CREATE INDEX "quiz_questions_org_dept_active_idx" ON "quiz_questions"("organizationId", "departmentId", "active");

-- QUIZ QUESTION OPTIONS ------------------------------------------------------
CREATE TABLE "quiz_question_options" (
    "id"             TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "questionId"     TEXT NOT NULL,
    "label"          TEXT NOT NULL,
    "isCorrect"      BOOLEAN NOT NULL DEFAULT false,
    "sortOrder"      INTEGER NOT NULL DEFAULT 0,
    "archivedAt"     TIMESTAMP(3),
    "departmentId"   TEXT,
    "ownerId"        TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "createdById"    TEXT,
    "updatedById"    TEXT
);
CREATE INDEX "quiz_question_options_org_question_idx" ON "quiz_question_options"("organizationId", "questionId");

-- QUIZ DEFINITIONS -----------------------------------------------------------
CREATE TABLE "quiz_definitions" (
    "id"            TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "slug"          TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "description"   TEXT,
    "departmentId"  TEXT,
    "categoryId"    TEXT,
    "status"        "QuizStatus" NOT NULL DEFAULT 'DRAFT',
    "questionCount" INTEGER NOT NULL DEFAULT 10,
    "pickStrategy"  TEXT NOT NULL DEFAULT 'random_balanced',
    "passThreshold" INTEGER NOT NULL DEFAULT 80,
    "timeLimitMins" INTEGER,
    "ownerId"       TEXT,
    "active"        BOOLEAN NOT NULL DEFAULT true,
    "archivedAt"    TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "createdById"   TEXT,
    "updatedById"   TEXT
);
CREATE UNIQUE INDEX "quiz_definitions_org_slug_key" ON "quiz_definitions"("organizationId", "slug");
CREATE INDEX "quiz_definitions_org_dept_status_idx" ON "quiz_definitions"("organizationId", "departmentId", "status");

-- QUIZ SHARE LINKS -----------------------------------------------------------
CREATE TABLE "quiz_share_links" (
    "id"              TEXT PRIMARY KEY,
    "organizationId"  TEXT NOT NULL,
    "quizId"          TEXT NOT NULL,
    "token"           TEXT NOT NULL,
    "label"           TEXT,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt"       TIMESTAMP(3),
    "active"          BOOLEAN NOT NULL DEFAULT true,
    "usageCount"      INTEGER NOT NULL DEFAULT 0,
    "ownerId"         TEXT,
    "departmentId"    TEXT,
    "archivedAt"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "createdById"     TEXT,
    "updatedById"     TEXT
);
CREATE UNIQUE INDEX "quiz_share_links_org_token_key" ON "quiz_share_links"("organizationId", "token");
CREATE INDEX "quiz_share_links_org_quiz_active_idx" ON "quiz_share_links"("organizationId", "quizId", "active");

-- QUIZ ATTEMPTS --------------------------------------------------------------
CREATE TABLE "quiz_attempts" (
    "id"                      TEXT PRIMARY KEY,
    "organizationId"          TEXT NOT NULL,
    "quizId"                  TEXT NOT NULL,
    "shareLinkId"             TEXT,
    "participantUserId"       TEXT,
    "participantName"         TEXT NOT NULL,
    "participantEmployeeId"   TEXT,
    "participantDepartmentId" TEXT,
    "participantManagerId"    TEXT,
    "status"                  "QuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "scorePercent"            INTEGER,
    "correctCount"            INTEGER NOT NULL DEFAULT 0,
    "totalCount"              INTEGER NOT NULL DEFAULT 0,
    "startedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"             TIMESTAMP(3),
    "certificateNumber"       TEXT,
    "ipAddress"               TEXT,
    "userAgent"               TEXT,
    "ownerId"                 TEXT,
    "departmentId"            TEXT,
    "archivedAt"              TIMESTAMP(3),
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,
    "createdById"             TEXT,
    "updatedById"             TEXT
);
CREATE UNIQUE INDEX "quiz_attempts_org_certificate_key" ON "quiz_attempts"("organizationId", "certificateNumber");
CREATE INDEX "quiz_attempts_org_quiz_status_idx" ON "quiz_attempts"("organizationId", "quizId", "status");
CREATE INDEX "quiz_attempts_org_user_created_idx" ON "quiz_attempts"("organizationId", "participantUserId", "createdAt");
CREATE INDEX "quiz_attempts_org_dept_created_idx" ON "quiz_attempts"("organizationId", "participantDepartmentId", "createdAt");

-- QUIZ ATTEMPT ANSWERS -------------------------------------------------------
CREATE TABLE "quiz_attempt_answers" (
    "id"               TEXT PRIMARY KEY,
    "organizationId"   TEXT NOT NULL,
    "attemptId"        TEXT NOT NULL,
    "questionId"       TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "freeTextAnswer"   TEXT,
    "correct"          BOOLEAN NOT NULL DEFAULT false,
    "scoredAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departmentId"     TEXT,
    "ownerId"          TEXT,
    "archivedAt"       TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "createdById"      TEXT,
    "updatedById"      TEXT
);
CREATE UNIQUE INDEX "quiz_attempt_answers_org_attempt_question_key" ON "quiz_attempt_answers"("organizationId", "attemptId", "questionId");
CREATE INDEX "quiz_attempt_answers_org_attempt_idx" ON "quiz_attempt_answers"("organizationId", "attemptId");
