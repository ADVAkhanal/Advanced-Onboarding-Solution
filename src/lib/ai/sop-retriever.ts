// Permission-scoped retrieval from approved SOP chunks.
//
// Strategy: Postgres full-text search via the trigger-maintained
// sop_chunks.searchVector tsvector. Results are scoped to the user's
// allowed departments / visibility tier and only ever consider APPROVED
// SOP versions. Drafts and superseded versions are never visible here.

import type { AuthenticatedUser } from "../auth";
import { prisma } from "../prisma";

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  documentVersionId: string;
  documentKey: string;
  documentTitle: string;
  headingPath: string;
  content: string;
  score: number;
  safetyCritical: boolean;
  qualityCritical: boolean;
  customerImpacting: boolean;
};

export type RetrieveOptions = {
  topK?: number;
  relevanceFloor?: number;
};

const DEFAULT_TOP_K = 6;
const DEFAULT_RELEVANCE_FLOOR = 0.04;

type RawRow = {
  chunkId: string;
  documentId: string;
  documentVersionId: string;
  documentKey: string;
  documentTitle: string;
  headingPath: string | null;
  content: string;
  score: number;
  safetyCritical: boolean;
  qualityCritical: boolean;
  customerImpacting: boolean;
};

function buildVisibilityClause(user: AuthenticatedUser): { sql: string; params: unknown[] } {
  const deptIds = Array.from(new Set([
    user.departmentId ?? null,
    ...user.departmentAccessIds
  ].filter((d): d is string => Boolean(d))));

  // Always include ALL_USERS docs.
  // DEPARTMENT visibility: scoped to the user's allowed departments.
  // MANAGER_PLUS / DIRECTOR_PLUS / ADMIN_ONLY: tier gating.
  const clauses: string[] = ['d.visibility = \'ALL_USERS\''];
  const params: unknown[] = [];

  if (deptIds.length) {
    params.push(deptIds);
    clauses.push(`(d.visibility = 'DEPARTMENT' AND d."departmentId" = ANY($${params.length}::text[]))`);
  }
  if (user.userLevel !== "USER") {
    clauses.push(`d.visibility = 'MANAGER_PLUS'`);
  }
  if (user.userLevel === "DIRECTOR" || user.userLevel === "ADMIN") {
    clauses.push(`d.visibility = 'DIRECTOR_PLUS'`);
  }
  if (user.userLevel === "ADMIN") {
    clauses.push(`d.visibility = 'ADMIN_ONLY'`);
  }

  return { sql: `(${clauses.join(" OR ")})`, params };
}

export async function retrieveChunks(
  user: AuthenticatedUser,
  question: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const topK = options.topK ?? DEFAULT_TOP_K;
  const relevanceFloor = options.relevanceFloor ?? DEFAULT_RELEVANCE_FLOOR;

  const visibility = buildVisibilityClause(user);

  // Parameters order: organizationId, [optional dept array], question
  const params: unknown[] = [user.organizationId];
  // The visibility clause appends a department-array param ($2) only if the
  // user has scoped department access; track its position so the final
  // websearch_to_tsquery placeholder is correct.
  const visibilityParams = visibility.params;
  for (const p of visibilityParams) {
    params.push(p);
  }
  params.push(question);
  const questionParamIndex = params.length;

  const sql = `
    SELECT
      c.id                     AS "chunkId",
      c."documentId"           AS "documentId",
      c."documentVersionId"    AS "documentVersionId",
      d."documentKey"          AS "documentKey",
      d.title                  AS "documentTitle",
      c."headingPath"          AS "headingPath",
      c.content                AS "content",
      d."safetyCritical"       AS "safetyCritical",
      d."qualityCritical"      AS "qualityCritical",
      d."customerImpacting"    AS "customerImpacting",
      ts_rank_cd(c."searchVector", websearch_to_tsquery('english', $${questionParamIndex})) AS "score"
    FROM "sop_chunks" c
    JOIN "sop_document_versions" v ON v.id = c."documentVersionId"
    JOIN "sop_documents" d ON d.id = c."documentId"
    WHERE c."organizationId" = $1
      AND c."archivedAt" IS NULL
      AND v."approvalStatus" = 'APPROVED'
      AND v."archivedAt" IS NULL
      AND d."archivedAt" IS NULL
      AND d.status = 'ACTIVE'
      AND ${visibility.sql}
      AND c."searchVector" @@ websearch_to_tsquery('english', $${questionParamIndex})
    ORDER BY "score" DESC
    LIMIT ${Math.max(1, Math.min(topK, 25))}
  `;

  const rows = await prisma.$queryRawUnsafe<RawRow[]>(sql, ...params);

  return rows
    .filter((r) => Number(r.score) >= relevanceFloor)
    .map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      documentVersionId: r.documentVersionId,
      documentKey: r.documentKey,
      documentTitle: r.documentTitle,
      headingPath: r.headingPath ?? "",
      content: r.content,
      score: Number(r.score),
      safetyCritical: r.safetyCritical,
      qualityCritical: r.qualityCritical,
      customerImpacting: r.customerImpacting
    }));
}
