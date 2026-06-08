"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["REQUESTED", "ASSIGNED", "IN_PROGRESS", "DONE"];

/** Inline status + assignee editor for one maintenance work order. */
export function WorkOrderStatusForm({
  id,
  status,
  assignee
}: {
  id: string;
  status: string;
  assignee: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function patch(payload: Record<string, string>) {
    setSaving(true);
    const response = await fetch(`/api/maintenance/work-orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <select
        className="select"
        aria-label="Work order status"
        defaultValue={status}
        disabled={saving}
        onChange={(e) => patch({ status: e.target.value })}
        style={{ minWidth: 130 }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <input
        className="input"
        aria-label="Assignee"
        defaultValue={assignee ?? ""}
        placeholder="Assignee"
        disabled={saving}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v !== (assignee ?? "")) patch({ assignee: v });
        }}
        style={{ maxWidth: 140 }}
      />
    </div>
  );
}
