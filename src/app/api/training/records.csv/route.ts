import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(_request: Request) {
  try {
    const user = await requirePermission("quiz:insights");
    const scope = user.userLevel === "ADMIN" ? {} : departmentScopeForUser(user);

    const attempts = await prisma.quizAttempt.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, ...scope },
      orderBy: { createdAt: "desc" },
      take: 5000
    });

    const quizzes = attempts.length
      ? await prisma.quizDefinition.findMany({
          where: { organizationId: user.organizationId, id: { in: attempts.map((a) => a.quizId) } }
        })
      : [];
    const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

    const header = [
      "attempt_id",
      "quiz_title",
      "quiz_slug",
      "participant_name",
      "participant_employee_id",
      "participant_department_id",
      "status",
      "score_percent",
      "correct_count",
      "total_count",
      "certificate_number",
      "started_at",
      "completed_at"
    ];

    const rows = attempts.map((a) => {
      const quiz = quizMap.get(a.quizId);
      return [
        a.id,
        quiz?.title ?? "",
        quiz?.slug ?? "",
        a.participantName,
        a.participantEmployeeId ?? "",
        a.participantDepartmentId ?? "",
        a.status,
        a.scorePercent ?? "",
        a.correctCount,
        a.totalCount,
        a.certificateNumber ?? "",
        a.startedAt.toISOString(),
        a.completedAt?.toISOString() ?? ""
      ].map(csvCell);
    });

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "training_records.export_csv",
      entityType: "quiz_attempt",
      after: { count: attempts.length }
    });

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=training-records.csv"
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
