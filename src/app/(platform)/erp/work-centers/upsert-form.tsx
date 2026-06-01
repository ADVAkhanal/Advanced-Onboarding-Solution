"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function str(value: FormDataEntryValue | null): string {
  return value === null ? "" : String(value).trim();
}

export function WorkCenterUpsertForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const data = new FormData(event.currentTarget);
    const payload = {
      code: str(data.get("code")),
      name: str(data.get("name")) || undefined,
      capacityHoursPerWeek: Number(str(data.get("capacityHoursPerWeek"))) || 0,
      notes: str(data.get("notes")) || undefined
    };

    const response = await fetch("/api/erp/work-centers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to save work center.");
      setSaving(false);
      return;
    }

    setSuccess("Saved. Capacity is now used by the Advanced Capacity dashboard.");
    setSaving(false);
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>Add or update a work center</h2>
        <span className="pill green">Upsert by code</span>
      </div>
      <div className="card-pad">
        <div className="module-note" style={{ marginBottom: 12 }}>
          The code must match the work-center value used on operations (e.g. <code>CNC-MILL</code>)
          so load and capacity line up. Capacity is weekly hours.
        </div>
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-grid two-col">
            <label>
              Code
              <input className="input" name="code" required maxLength={60} placeholder="CNC-MILL" />
            </label>
            <label>
              Name
              <input className="input" name="name" maxLength={120} placeholder="CNC Milling" />
            </label>
            <label>
              Capacity (hours / week)
              <input className="input" type="number" step="0.5" min={0} name="capacityHoursPerWeek" required />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Notes
              <textarea className="textarea" name="notes" maxLength={2000} placeholder="Shifts, machine count, constraints — text only." />
            </label>
          </div>
          {error ? <div className="pill red" role="alert">{error}</div> : null}
          {success ? <div className="pill green" role="status">{success}</div> : null}
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save work center"}
          </button>
        </form>
      </div>
    </section>
  );
}
