"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Per-request proposal controls: share a PDF (by URL) via Papermark, then
 * refresh its view/download analytics back into the CRM record.
 */
export function ProposalActions({
  id,
  hasLink,
  viewUrl,
  views,
  enabled
}: {
  id: string;
  hasLink: boolean;
  viewUrl: string | null;
  views: number;
  enabled: boolean;
}) {
  const router = useRouter();
  const [fileUrl, setFileUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!enabled) {
    return <span className="metric-note">Papermark off</span>;
  }

  async function share() {
    if (!fileUrl.trim()) {
      setError("Paste the proposal PDF URL.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/integrations/crm/${id}/proposal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileUrl: fileUrl.trim() })
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to share proposal.");
      return;
    }
    router.refresh();
  }

  async function refresh() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/integrations/crm/${id}/proposal`, { method: "PATCH" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  if (hasLink) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {viewUrl ? (
          <a className="button" href={viewUrl} target="_blank" rel="noopener noreferrer">↗ View</a>
        ) : null}
        <button className="button" type="button" onClick={refresh} disabled={busy} title="Pull latest Papermark views/downloads">
          {busy ? "…" : `↻ ${views} views`}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
      <input
        className="input"
        value={fileUrl}
        onChange={(e) => setFileUrl(e.target.value)}
        placeholder="Proposal PDF URL"
        aria-label="Proposal PDF URL"
        style={{ maxWidth: 180 }}
        disabled={busy}
      />
      <button className="button" type="button" onClick={share} disabled={busy}>
        {busy ? "…" : "Share"}
      </button>
      {error ? <div className="pill red" role="alert">{error}</div> : null}
    </div>
  );
}
