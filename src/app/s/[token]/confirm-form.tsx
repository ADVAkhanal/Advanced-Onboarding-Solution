"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmForm({ token, shipmentNumber }: { token: string; shipmentNumber: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/public/ship-confirm/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmedByName: name.trim() })
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Could not confirm. Please try again.");
      return;
    }
    router.refresh();
  }

  return (
    <form className="public-confirm-form" onSubmit={submit}>
      <label htmlFor="confirm-name">Your name</label>
      <input
        id="confirm-name"
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name of person receiving"
        autoComplete="name"
        disabled={busy}
      />
      <button className="button primary" type="submit" disabled={busy}>
        {busy ? "Confirming…" : `Confirm receipt of ${shipmentNumber}`}
      </button>
      {error ? <div className="pill red" role="alert">{error}</div> : null}
    </form>
  );
}
