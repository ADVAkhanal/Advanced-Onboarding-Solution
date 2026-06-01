"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OperationOption = { id: string; label: string };

function str(value: FormDataEntryValue | null): string {
  return value === null ? "" : String(value).trim();
}

export function OperationCompleteForm({ operations }: { operations: OperationOption[] }) {
  const router = useRouter();
  const [operationId, setOperationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!operationId) {
      setError("Choose an operation to complete.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    const data = new FormData(event.currentTarget);
    const completedAtRaw = str(data.get("completedAt"));
    const payload = {
      actualSetupHours: Number(str(data.get("actualSetupHours"))) || 0,
      actualRunHours: Number(str(data.get("actualRunHours"))) || 0,
      completedQuantity: Number(str(data.get("completedQuantity"))) || 0,
      completedAt: completedAtRaw
        ? new Date(`${completedAtRaw}T00:00:00`).toISOString()
        : new Date().toISOString(),
      notes: str(data.get("notes")) || undefined
    };

    const response = await fetch(`/api/erp/operations/${operationId}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to complete operation.");
      setSaving(false);
      return;
    }

    const body = await response.json().catch(() => null);
    setSuccess(
      body?.data?.fedCycleTimeLoop
        ? "Operation completed. Cycle-time estimate refreshed from these actuals."
        : "Operation completed. (Part has no manufacturing bucket, so no estimate was updated.)"
    );
    setSaving(false);
    event.currentTarget.reset();
    setOperationId("");
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>Complete an operation</h2>
        <span className="pill green">Feeds cycle-time</span>
      </div>
      <div className="card-pad">
        <div className="module-note" style={{ marginBottom: 12 }}>
          Log what a finished operation actually took. When the work order&apos;s part has a
          material / process / complexity bucket, completing it refreshes that bucket&apos;s
          cycle-time estimate automatically. No CUI, alloy specs, or drawing references.
        </div>
        {operations.length === 0 ? (
          <div className="empty">No open operations to complete.</div>
        ) : (
          <form onSubmit={onSubmit} className="form-grid">
            <label>
              Operation
              <select
                className="select"
                value={operationId}
                onChange={(e) => setOperationId(e.target.value)}
                required
              >
                <option value="">Select operation</option>
                {operations.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid two-col">
              <label>
                Actual setup hours
                <input className="input" type="number" step="0.01" min={0} name="actualSetupHours" required />
              </label>
              <label>
                Actual run hours
                <input className="input" type="number" step="0.01" min={0} name="actualRunHours" required />
              </label>
              <label>
                Completed quantity
                <input className="input" type="number" step="1" min={0} name="completedQuantity" required />
              </label>
              <label>
                Completed on
                <input className="input" type="date" name="completedAt" />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Notes
                <textarea className="textarea" name="notes" maxLength={2000} placeholder="Tooling, material lot variance, rework — text only." />
              </label>
            </div>
            {error ? <div className="pill red" role="alert">{error}</div> : null}
            {success ? <div className="pill green" role="status">{success}</div> : null}
            <button className="button primary" type="submit" disabled={saving}>
              {saving ? "Completing…" : "Complete operation"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
