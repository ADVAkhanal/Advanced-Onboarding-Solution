// Persist a SopEscalation row from an AnswerResult and route it to the
// requesting user's manager (fallback director, fallback any admin).

import type { AuthenticatedUser } from "../auth";
import { prisma } from "../prisma";
import type { AnswerResult } from "./sop-answerer";

async function pickRoutedManager(user: AuthenticatedUser): Promise<string | null> {
  if (user.managerId) {
    return user.managerId;
  }
  if (user.directorId) {
    return user.directorId;
  }
  const admin = await prisma.user.findFirst({
    where: {
      organizationId: user.organizationId,
      userLevel: "ADMIN",
      status: "ACTIVE",
      archivedAt: null
    },
    orderBy: { createdAt: "asc" }
  });
  return admin?.id ?? null;
}

export async function persistSopQueryAndEscalation(input: {
  user: AuthenticatedUser;
  redactedQuestion: string;
  questionHash: string;
  result: AnswerResult;
}) {
  const { user, redactedQuestion, questionHash, result } = input;

  const retrievedIds = result.retrievedChunks.map((c) => c.chunkId);

  const query = await prisma.sopQuery.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      departmentId: user.departmentId ?? undefined,
      questionRedacted: redactedQuestion,
      questionHash,
      retrievedChunkIds: retrievedIds,
      topScore: result.retrievedChunks[0]?.score ?? undefined,
      modelUsed: result.providerMetadata.model || undefined,
      outcome: result.outcome,
      confidence: result.confidence ?? undefined,
      answerShown: result.answerShown ?? undefined,
      triggers: JSON.parse(JSON.stringify(result.triggers)),
      inputTokens: result.providerMetadata.inputTokens,
      outputTokens: result.providerMetadata.outputTokens,
      cacheReadTokens: result.providerMetadata.cacheReadTokens,
      errorMessage: result.errorMessage ?? undefined,
      ownerId: user.id,
      createdById: user.id,
      updatedById: user.id
    }
  });

  if (result.citations.length) {
    await prisma.sopCitation.createMany({
      data: result.citations.map((c, rank) => ({
        organizationId: user.organizationId,
        queryId: query.id,
        chunkId: c.chunkId,
        documentId: c.documentId,
        rank,
        supports: c.supports,
        departmentId: user.departmentId ?? undefined,
        ownerId: user.id,
        createdById: user.id,
        updatedById: user.id
      }))
    });
  }

  let escalation: { id: string; routedToUserId: string | null } | null = null;
  if (result.outcome === "ESCALATED") {
    const routedToUserId = await pickRoutedManager(user);
    const created = await prisma.sopEscalation.create({
      data: {
        organizationId: user.organizationId,
        queryId: query.id,
        userId: user.id,
        departmentId: user.departmentId ?? undefined,
        routedToUserId: routedToUserId ?? undefined,
        reasonSummary: result.escalationReason ?? "Escalated for human review.",
        triggers: JSON.parse(JSON.stringify(result.triggers)),
        status: routedToUserId ? "ASSIGNED" : "OPEN",
        ownerId: routedToUserId ?? user.id,
        createdById: user.id,
        updatedById: user.id
      }
    });
    escalation = { id: created.id, routedToUserId: created.routedToUserId };
  }

  return { queryId: query.id, escalation };
}
