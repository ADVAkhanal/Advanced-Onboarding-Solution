"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ShipNotify controls for one shipment on the board: notify (arm the confirm
 * loop + alert staff), open the printable packing slip, and show confirm state.
 */
export function ShipmentActions({
  id,
  notified,
  confirmed
}: {
  id: string;
  notified: boolean;
  confirmed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function notify(force: boolean) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/erp/shipping/${id}/notify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ force })
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Notify failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {confirmed ? (
        <span className="pill green">confirmed</span>
      ) : (
        <button className="button" type="button" onClick={() => notify(notified)} disabled={busy}>
          {busy ? "…" : notified ? "Re-notify" : "Notify"}
        </button>
      )}
      <a className="button" href={`/erp/shipping/${id}/packing-slip`} target="_blank" rel="noopener noreferrer">
        Packing slip
      </a>
      {!confirmed && notified ? <span className="pill amber">awaiting confirm</span> : null}
      {error ? <span className="pill red" role="alert">{error}</span> : null}
    </div>
  );
}
