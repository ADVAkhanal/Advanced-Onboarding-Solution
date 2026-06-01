"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncNowButton({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run() {
    setSaving(true);
    setMessage("");
    setError("");
    const response = await fetch("/api/erp/proshop/sync", { method: "POST" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const summary = body?.data?.summary;
      setError(summary?.error ?? body?.error?.message ?? "Sync failed.");
      setSaving(false);
      router.refresh();
      return;
    }
    const s = body?.data?.summary;
    setMessage(s ? `Synced: ${s.recordsUpserted} updated, ${s.recordsStale} marked stale.` : "Sync complete.");
    setSaving(false);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        className="button primary"
        onClick={run}
        disabled={saving || !configured}
        title={configured ? undefined : "Set PROSHOP_* env to enable sync"}
      >
        {saving ? "Syncing…" : "Sync now"}
      </button>
      {message ? <div className="pill green" role="status" style={{ marginTop: 8 }}>{message}</div> : null}
      {error ? <div className="pill red" role="alert" style={{ marginTop: 8 }}>{error}</div> : null}
    </div>
  );
}
