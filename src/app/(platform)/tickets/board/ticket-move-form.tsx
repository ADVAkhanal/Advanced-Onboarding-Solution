"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Must match ticketUpdateSchema's status enum.
const STATUSES = ["New", "Assigned", "In Progress", "Waiting", "Blocked", "Escalated", "Resolved", "Closed"];

/** Inline status mover for one ticket card on the triage board. */
export function TicketMoveForm({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function move(next: string) {
    if (!next || next === status) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next })
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to move ticket.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <select
        className="select"
        aria-label="Move ticket"
        value={STATUSES.includes(status) ? status : ""}
        disabled={saving}
        onChange={(e) => move(e.target.value)}
        style={{ width: "100%", marginTop: 6 }}
      >
        {!STATUSES.includes(status) ? <option value="">{status}</option> : null}
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {error ? (
        <div className="pill red" role="alert" style={{ marginTop: 4 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
