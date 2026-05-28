"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TransitionTarget = {
  status: string;
  label: string;
  pillClass: string;
  requiresReason?: boolean;
  requiresSubmitPermission?: boolean;
};

// Mirror of ALLOWED_TRANSITIONS in the API route. Keep in sync when
// the state machine changes.
const TRANSITIONS_FROM: Record<string, TransitionTarget[]> = {
  DRAFT: [
    {
      status: "QUOTED",
      label: "Send to customer",
      pillClass: "button primary",
      requiresSubmitPermission: true
    },
    { status: "ON_HOLD", label: "Hold", pillClass: "button" }
  ],
  QUOTED: [
    {
      status: "WON",
      label: "Mark won",
      pillClass: "button primary",
      requiresSubmitPermission: true,
      requiresReason: true
    },
    {
      status: "LOST",
      label: "Mark lost",
      pillClass: "button",
      requiresSubmitPermission: true,
      requiresReason: true
    },
    { status: "ON_HOLD", label: "Hold", pillClass: "button" },
    { status: "EXPIRED", label: "Mark expired", pillClass: "button" },
    { status: "DRAFT", label: "Return to draft", pillClass: "button" }
  ],
  ON_HOLD: [
    { status: "DRAFT", label: "Resume as draft", pillClass: "button" },
    {
      status: "QUOTED",
      label: "Resume and send",
      pillClass: "button primary",
      requiresSubmitPermission: true
    },
    {
      status: "LOST",
      label: "Mark lost",
      pillClass: "button",
      requiresSubmitPermission: true,
      requiresReason: true
    }
  ],
  WON: [],
  LOST: [],
  EXPIRED: [{ status: "DRAFT", label: "Re-open as draft", pillClass: "button" }]
};

export function QuoteStatusActions({
  quoteId,
  currentStatus,
  canSubmit
}: {
  quoteId: string;
  currentStatus: string;
  canSubmit: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  const transitions = TRANSITIONS_FROM[currentStatus] ?? [];

  async function transition(target: TransitionTarget) {
    setError("");

    if (target.requiresSubmitPermission && !canSubmit) {
      setError("Only directors and above can perform this transition.");
      return;
    }

    let reason: string | undefined;
    if (target.requiresReason) {
      const input = window.prompt(
        `Reason for marking this quote ${target.status}? (Required)`
      );
      if (!input || input.trim().length < 1) {
        return;
      }
      reason = input.trim().slice(0, 500);
    }

    setPending(target.status);
    const response = await fetch(`/api/erp/quotes/${quoteId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: target.status, reason })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to transition status.");
      setPending(null);
      return;
    }

    setPending(null);
    router.refresh();
  }

  if (transitions.length === 0) {
    return (
      <p className="metric-note">
        This quote is in a terminal state ({currentStatus}). No further transitions allowed.
      </p>
    );
  }

  return (
    <div>
      <div className="actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        {transitions.map((target) => {
          const disabled =
            pending !== null || (target.requiresSubmitPermission && !canSubmit);
          return (
            <button
              key={target.status}
              type="button"
              className={target.pillClass}
              disabled={disabled}
              onClick={() => transition(target)}
              title={
                target.requiresSubmitPermission && !canSubmit
                  ? "Requires quote:submit (director or admin)"
                  : undefined
              }
            >
              {pending === target.status ? "Saving…" : target.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <div className="pill red" role="alert" style={{ marginTop: 8 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
