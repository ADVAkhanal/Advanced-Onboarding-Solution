"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["On Cycle", "Inspection", "In Queue", "Completed"];
const RESULTS = ["", "Pass", "Fail", "Pending"];

/** Inline status + result editor for one first-piece run (shop-floor board). */
export function FirstPieceOutcomeForm({
  id,
  status,
  result
}: {
  id: string;
  status: string;
  result: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function patch(payload: Record<string, string>) {
    setSaving(true);
    const response = await fetch(`/api/erp/first-piece/${id}`, {
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
        aria-label="Run status"
        defaultValue={status}
        disabled={saving}
        onChange={(e) => patch({ status: e.target.value })}
        style={{ minWidth: 110 }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        className="select"
        aria-label="Run result"
        defaultValue={result ?? ""}
        disabled={saving}
        onChange={(e) => patch({ result: e.target.value })}
        style={{ minWidth: 100 }}
      >
        {RESULTS.map((r) => (
          <option key={r} value={r}>
            {r || "—"}
          </option>
        ))}
      </select>
    </div>
  );
}
