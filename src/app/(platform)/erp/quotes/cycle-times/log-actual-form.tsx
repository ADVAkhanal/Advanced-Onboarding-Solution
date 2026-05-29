"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MATERIALS: Array<[string, string]> = [
  ["ALLOY_STEEL", "Alloy steel"],
  ["STAINLESS_STEEL", "Stainless steel"],
  ["CARBON_STEEL", "Carbon steel"],
  ["ALUMINUM", "Aluminum"],
  ["TITANIUM", "Titanium"],
  ["BRASS", "Brass"],
  ["COPPER", "Copper"],
  ["NICKEL_ALLOY", "Nickel alloy"],
  ["PLASTIC", "Plastic"],
  ["COMPOSITE", "Composite"],
  ["OTHER", "Other"]
];

const PROCESSES: Array<[string, string]> = [
  ["TURNING", "Turning"],
  ["MILLING", "Milling"],
  ["MULTI_SPINDLE", "Multi-spindle"],
  ["SWISS_TURNING", "Swiss turning"],
  ["GRINDING", "Grinding"],
  ["EDM", "EDM"],
  ["WIRE_EDM", "Wire EDM"],
  ["HONING", "Honing"],
  ["LAPPING", "Lapping"],
  ["INSPECTION", "Inspection"],
  ["ASSEMBLY", "Assembly"],
  ["OTHER", "Other"]
];

const COMPLEXITIES: Array<[string, string]> = [
  ["SIMPLE", "Simple"],
  ["MODERATE", "Moderate"],
  ["COMPLEX", "Complex"],
  ["HIGHLY_COMPLEX", "Highly complex"]
];

const DIAMETERS: Array<[string, string]> = [
  ["NOT_APPLICABLE", "Not applicable"],
  ["UNDER_25_MM", "Under 25 mm"],
  ["FROM_25_TO_75_MM", "25 to 75 mm"],
  ["FROM_75_TO_150_MM", "75 to 150 mm"],
  ["FROM_150_TO_300_MM", "150 to 300 mm"],
  ["OVER_300_MM", "Over 300 mm"]
];

function str(value: FormDataEntryValue | null): string {
  return value === null ? "" : String(value).trim();
}

export function LogActualForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const data = new FormData(event.currentTarget);
    const completedAtRaw = str(data.get("completedAt"));

    const payload = {
      materialCategory: str(data.get("materialCategory")),
      process: str(data.get("process")),
      complexityClass: str(data.get("complexityClass")),
      diameterClass: str(data.get("diameterClass")) || "NOT_APPLICABLE",
      quantity: Number(str(data.get("quantity"))) || 0,
      actualSetupHours: Number(str(data.get("actualSetupHours"))) || 0,
      actualCycleMinutesPerPiece: Number(str(data.get("actualCycleMinutesPerPiece"))) || 0,
      completedAt: completedAtRaw
        ? new Date(`${completedAtRaw}T00:00:00`).toISOString()
        : new Date().toISOString(),
      notes: str(data.get("notes")) || undefined
    };

    const response = await fetch("/api/erp/job-actuals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to log actual.");
      setSaving(false);
      return;
    }

    const body = await response.json().catch(() => null);
    const lookup = body?.data?.lookup;
    if (lookup) {
      const conf =
        lookup.confidenceScore != null
          ? ` · confidence ${(Number(lookup.confidenceScore) * 100).toFixed(0)}%`
          : "";
      setSuccess(
        `Logged. Estimate refreshed from ${lookup.sampleSize} sample(s)${conf}.`
      );
    } else {
      setSuccess("Logged.");
    }
    setSaving(false);
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>Log a completed-job actual</h2>
        <span className="pill green">Refreshes the estimate</span>
      </div>
      <div className="card-pad">
        <div className="module-note" style={{ marginBottom: 12 }}>
          Record how long a finished job actually took. The matching cycle-time estimate is
          recomputed from this shop&apos;s logged actuals and marked <strong>Derived</strong>.
          Enter real setup hours and per-piece cycle minutes. No CUI, alloy specs, drawing
          references, or customer-identifying detail.
        </div>
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-grid two-col">
            <label>
              Material
              <select className="select" name="materialCategory" required>
                <option value="">Select</option>
                {MATERIALS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Process
              <select className="select" name="process" required>
                <option value="">Select</option>
                {PROCESSES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Complexity
              <select className="select" name="complexityClass" required>
                <option value="">Select</option>
                {COMPLEXITIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Diameter class
              <select className="select" name="diameterClass" defaultValue="NOT_APPLICABLE">
                {DIAMETERS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity completed
              <input
                className="input"
                type="number"
                min={1}
                step={1}
                name="quantity"
                required
              />
            </label>
            <label>
              Completed on
              <input className="input" type="date" name="completedAt" />
            </label>
            <label>
              Actual setup hours
              <input
                className="input"
                type="number"
                step="0.01"
                min={0}
                name="actualSetupHours"
                required
              />
            </label>
            <label>
              Actual cycle min/pc
              <input
                className="input"
                type="number"
                step="0.001"
                min={0}
                name="actualCycleMinutesPerPiece"
                required
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Notes
              <textarea
                className="textarea"
                name="notes"
                maxLength={2000}
                placeholder="Anything that affected this run — tooling, material lot variance, etc. Text only."
              />
            </label>
          </div>
          {error ? (
            <div className="pill red" role="alert">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="pill green" role="status">
              {success}
            </div>
          ) : null}
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? "Logging…" : "Log actual & refresh estimate"}
          </button>
        </form>
      </div>
    </section>
  );
}
