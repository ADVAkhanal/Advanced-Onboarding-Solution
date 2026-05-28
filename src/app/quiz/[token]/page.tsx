import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuizRunner } from "./runner";

export const dynamic = "force-dynamic";

export default async function PublicQuizPage({ params }: { params: { token: string } }) {
  const link = await prisma.quizShareLink.findFirst({
    where: { token: params.token, active: true, archivedAt: null }
  });

  if (!link) {
    notFound();
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return (
      <div style={{ maxWidth: 720, margin: "60px auto", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
        <h1>Link expired</h1>
        <p>This quiz share link has expired. Ask your manager for a fresh link.</p>
      </div>
    );
  }

  const quiz = await prisma.quizDefinition.findFirst({
    where: { id: link.quizId, organizationId: link.organizationId, archivedAt: null }
  });
  if (!quiz || quiz.status !== "PUBLISHED") {
    notFound();
  }

  return (
    <div style={{ maxWidth: 760, margin: "32px auto", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: 1, color: "#666", fontSize: 12, margin: 0 }}>
          Advanced Shop Training
        </p>
        <h1 style={{ margin: "4px 0 0" }}>{quiz.title}</h1>
        {quiz.description ? <p style={{ color: "#444" }}>{quiz.description}</p> : null}
        <p style={{ color: "#888", fontSize: 13 }}>
          Pass threshold: {quiz.passThreshold}% · {quiz.questionCount} questions
          {quiz.timeLimitMins ? ` · ${quiz.timeLimitMins} min time limit` : ""}
        </p>
      </header>
      <QuizRunner token={params.token} />
      <footer style={{ marginTop: 40, color: "#888", fontSize: 12 }}>
        <p>
          Records of completion are saved in the Advanced Shop training database. Manager-controlled. Not a
          replacement for any required regulatory or HR record.
        </p>
      </footer>
    </div>
  );
}
