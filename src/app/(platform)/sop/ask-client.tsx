"use client";

import { useState } from "react";

type Citation = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  headingPath: string;
  supports: string;
};

type AskResponse = {
  queryId: string;
  outcome: "ANSWERED" | "REFUSED" | "ESCALATED" | "PROVIDER_ERROR" | "REJECTED_BY_FILTER";
  answer: string | null;
  citations: Citation[];
  escalation:
    | {
        id: string;
        routedToUserId: string | null;
        reason: string | null;
        triggers: Record<string, boolean>;
      }
    | null;
  confidence: number | null;
  redactionApplied: string[];
};

export function SopAskClient() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (question.trim().length < 3) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/sop/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? "Could not get an answer right now.");
      } else {
        setResponse(body as AskResponse);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-pad">
      <form onSubmit={submit}>
        <label htmlFor="sop-question">
          <strong>Your question</strong>
          <span className="metric-note" style={{ marginLeft: 8 }}>
            Plain English. No customer drawings, no part numbers if they are customer-controlled.
          </span>
        </label>
        <textarea
          id="sop-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. What is the first-piece inspection sign-off process?"
          rows={4}
          maxLength={4000}
          required
          style={{ width: "100%", marginTop: 8, padding: 12, fontFamily: "inherit", fontSize: 14 }}
        />
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <button type="submit" className="button primary" disabled={loading || question.trim().length < 3}>
            {loading ? "Searching SOPs..." : "Ask the SOP assistant"}
          </button>
          <span className="metric-note">{question.length}/4000</span>
        </div>
      </form>

      {error ? (
        <div className="callout red" style={{ marginTop: 16 }}>
          <strong>Could not answer:</strong> {error}
        </div>
      ) : null}

      {response ? (
        <div style={{ marginTop: 20 }}>
          {response.outcome === "ANSWERED" && response.answer ? (
            <>
              <div className="pill green" style={{ marginBottom: 12 }}>
                Answered · confidence {Math.round((response.confidence ?? 0) * 100)}%
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{response.answer}</div>
              {response.citations.length ? (
                <div style={{ marginTop: 16 }}>
                  <strong>Sources</strong>
                  <ul className="compact-list" style={{ marginTop: 8 }}>
                    {response.citations.map((c) => (
                      <li key={c.chunkId}>
                        <strong>{c.documentTitle}</strong>
                        {c.headingPath ? <span className="metric-note"> — {c.headingPath}</span> : null}
                        <div className="metric-note" style={{ marginTop: 4 }}>
                          Supports: {c.supports}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}

          {response.outcome === "ESCALATED" && response.escalation ? (
            <div className="callout amber">
              <strong>Routed to a manager.</strong>
              <p style={{ marginTop: 6 }}>
                This question needs human review. {response.escalation.reason}
              </p>
              <p className="metric-note" style={{ marginTop: 6 }}>
                Triggers fired:{" "}
                {Object.entries(response.escalation.triggers)
                  .filter(([, value]) => value)
                  .map(([key]) => key.replace(/_/g, " "))
                  .join(", ") || "(none)"}
              </p>
              <p className="metric-note" style={{ marginTop: 6 }}>
                Escalation ID: <code>{response.escalation.id}</code>
              </p>
            </div>
          ) : null}

          {response.outcome === "REFUSED" ? (
            <div className="callout amber">
              <strong>No supported answer.</strong>
              <p>
                The retrieved SOP sections did not materially support an answer to your question. This has
                been logged.
              </p>
            </div>
          ) : null}

          {response.outcome === "PROVIDER_ERROR" ? (
            <div className="callout red">
              <strong>AI provider unavailable.</strong>
              <p>
                Your question was not answered. Please try again, or escalate to your manager directly if it
                is urgent.
              </p>
            </div>
          ) : null}

          {response.redactionApplied.length ? (
            <p className="metric-note" style={{ marginTop: 12 }}>
              Sensitive field types redacted before sending to the AI: {response.redactionApplied.join(", ")}.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
