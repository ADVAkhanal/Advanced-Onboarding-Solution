import type { AuthenticatedUser } from "./auth";
import { departmentScopeForUser } from "./auth";
import { prisma } from "./prisma";

export type QuizSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  departmentId: string | null;
  questionCount: number;
  passThreshold: number;
  status: string;
};

export type AttemptSummary = {
  id: string;
  participantName: string;
  participantDepartmentId: string | null;
  scorePercent: number | null;
  status: string;
  correctCount: number;
  totalCount: number;
  startedAt: string;
  completedAt: string | null;
  certificateNumber: string | null;
  quizId: string;
};

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateShareToken(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += TOKEN_ALPHABET.charAt(Math.floor(Math.random() * TOKEN_ALPHABET.length));
  }
  return out;
}

export function generateCertificateNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString();
  const day = `${date.getMonth() + 1}`.padStart(2, "0") + `${date.getDate()}`.padStart(2, "0");
  return `CERT-${year}${day}-${generateShareToken(6)}`;
}

export async function getTrainingScope(user: AuthenticatedUser) {
  if (user.userLevel === "ADMIN") {
    return {};
  }
  return departmentScopeForUser(user);
}

export async function getManagerTrainingDashboard(user: AuthenticatedUser) {
  const scope = await getTrainingScope(user);

  const [quizzes, totalAttempts, passed, failed, recent] = await Promise.all([
    prisma.quizDefinition.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, ...scope },
      orderBy: { updatedAt: "desc" },
      take: 50
    }),
    prisma.quizAttempt.count({
      where: { organizationId: user.organizationId, archivedAt: null, ...scope }
    }),
    prisma.quizAttempt.count({
      where: { organizationId: user.organizationId, status: "PASSED", archivedAt: null, ...scope }
    }),
    prisma.quizAttempt.count({
      where: { organizationId: user.organizationId, status: "FAILED", archivedAt: null, ...scope }
    }),
    prisma.quizAttempt.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, ...scope },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return {
    quizzes,
    totalAttempts,
    passed,
    failed,
    passRate: totalAttempts === 0 ? null : Math.round((passed / totalAttempts) * 100),
    recent
  };
}
