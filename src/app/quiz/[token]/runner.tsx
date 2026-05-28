"use client";

import { useState } from "react";

type Option = { id: string; label: string; sortOrder: number };
type Question = {
  id: string;
  prompt: string;
  difficulty: string;
  safetyCritical: boolean;
  qualityCritical: boolean;
  options: Option[];
};

type StartResponse = {
  attemptId: string;
  quiz: { id: string; title: string; description: string | null; passThreshold: number; timeLimitMins: number | null };
  questions: Question[];
};

type SubmitResponse = {
  attempt: {
    id: string;
    status: string;
    scorePercent: number | null;
    correctCount: number;
    totalCount: number;
    passed: boolean;
    certificateNumber: string | null;
  };
};

export function QuizRunner({ token }: { token: string }) {
  const [step, setStep] = useState<"start" | "in_progress" | "done">("start");
  const [participantName, setParticipantName] = useState("");
  const [participantEmployeeId, setParticipantEmployeeId] = useState("");
  const [participantDepartmentId, setParticipantDepartmentId] = useState("");
  const [participantManagerId, setParticipantManagerId] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResponse["attempt"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/training/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareToken: token,
          participantName,
          participantEmployeeId: participantEmployeeId || undefined,
          participantDepartmentId: participantDepartmentId || undefined,
          participantManagerId: participantManagerId || undefined
        })
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Could not start quiz.");
      } else {
        const data = body as StartResponse;
        setAttemptId(data.attemptId);
        setQuestions(data.questions);
        setStep("in_progress");
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!attemptId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/training/attempts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedOptionId: answers[q.id]
          }))
        })
      });
      const body = (await response.json()) as SubmitResponse;
      if (!response.ok) {
        setError("Could not submit quiz.");
      } else {
        setResult(body.attempt);
        setStep("done");
      }
    } finally {
      setBusy(false);
    }
  };

  if (step === "start") {
    return (
      <form
        onSubmit={start}
        style={{ border: "1px solid #ddd", borderRadius: 8, padding: 24, background: "#fff" }}
      >
        <h2 style={{ marginTop: 0 }}>Participant info</h2>
        <label style={{ display: "block", marginBottom: 12 }}>
          <strong>Your name *</strong>
          <input
            type="text"
            value={participantName}
            onChange={(event) => setParticipantName(event.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          <strong>Employee ID</strong>
          <input
            type="text"
            value={participantEmployeeId}
            onChange={(event) => setParticipantEmployeeId(event.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          <strong>Department</strong>
          <input
            type="text"
            value={participantDepartmentId}
            onChange={(event) => setParticipantDepartmentId(event.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          <strong>Manager / trainer</strong>
          <input
            type="text"
            value={participantManagerId}
            onChange={(event) => setParticipantManagerId(event.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        {error ? <p style={{ color: "red" }}>{error}</p> : null}
        <button type="submit" disabled={busy || !participantName} style={{ padding: "10px 16px", fontSize: 15 }}>
          {busy ? "Starting..." : "Start quiz"}
        </button>
      </form>
    );
  }

  if (step === "in_progress") {
    const allAnswered = questions.every((q) => answers[q.id]);
    return (
      <div>
        {questions.map((q, index) => (
          <div
            key={q.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 20,
              marginBottom: 16,
              background: "#fff"
            }}
          >
            <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
              Question {index + 1} of {questions.length}
              {q.safetyCritical ? " · SAFETY-CRITICAL" : ""}
              {q.qualityCritical ? " · QUALITY-CRITICAL" : ""}
            </p>
            <h3 style={{ marginTop: 4 }}>{q.prompt}</h3>
            {q.options.map((option) => (
              <label key={option.id} style={{ display: "block", padding: "6px 0" }}>
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  value={option.id}
                  checked={answers[q.id] === option.id}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: option.id }))}
                />{" "}
                {option.label}
              </label>
            ))}
          </div>
        ))}
        {error ? <p style={{ color: "red" }}>{error}</p> : null}
        <button onClick={submit} disabled={!allAnswered || busy} style={{ padding: "10px 16px", fontSize: 15 }}>
          {busy ? "Scoring..." : "Submit quiz"}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 24,
        background: result?.passed ? "#ecfdf5" : "#fef2f2"
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        {result?.passed ? "Passed" : "Did not pass"} — {result?.scorePercent ?? 0}%
      </h2>
      <p>
        You answered {result?.correctCount} out of {result?.totalCount} correctly.
      </p>
      {result?.certificateNumber ? (
        <p>
          <strong>Certificate:</strong> <code>{result.certificateNumber}</code>
        </p>
      ) : null}
      <p>Your attempt has been recorded. Your manager will see it in the Training Records inbox.</p>
    </div>
  );
}
