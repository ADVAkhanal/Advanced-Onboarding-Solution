"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** One-click loader for the Advanced machine roster + MRO + PM baseline. */
export function MaintenanceSeedButton() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function seed() {
    setSaving(true);
    setError("");
    const response = await fetch("/api/maintenance/seed", { method: "POST" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to load baseline.");
      setSaving(false);
      return;
    }
    const body = await response.json().catch(() => null);
    const r = body?.data?.result;
    setDone(r?.skipped ? "Baseline already loaded." : `Loaded ${r?.machines ?? 0} machines, ${r?.pmTasks ?? 0} PM tasks, ${r?.parts ?? 0} parts.`);
    setSaving(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      <button className="button primary" type="button" onClick={seed} disabled={saving}>
        {saving ? "Loading baseline…" : "Load Advanced machine roster"}
      </button>
      {error ? <div className="pill red" role="alert">{error}</div> : null}
      {done ? <div className="pill green" role="status">{done}</div> : null}
    </div>
  );
}
