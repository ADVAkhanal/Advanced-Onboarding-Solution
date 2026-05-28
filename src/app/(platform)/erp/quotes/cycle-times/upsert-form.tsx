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

function num(value: FormDataEntryValue | null): number | undefined {
  if (value === null) return undefined;
  const raw = String(value).trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function CycleTimeUpsertForm() {
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
    const setup = num(data.get("estimatedSetupHours"));
    const cycle = num(data.get("estimatedCycleMinutes"));

    if (setup === undefined || cycle === undefined) {
      setError("Setup hours and cycle minutes are required.");
      setSaving(false);
      return;
    }

    const payload = {
      materialCategory: str(data.get("materialCategory")),
      process: str(data.get("process")),
      complexityClass: str(data.get("complexityClass")),
      diameterClass: str(data.get("diameterClass")) || "NOT_APPLICABLE",
      estimatedSetupHours: setup,
      estimatedCycleMinutes: cycle,
      sampleSize: num(data.get("sampleSize")),
      confidenceScore: num(data.get("confidenceScore")),
      notes: str(data.get("notes")) || undefined
    };

    const response = await fetch("/api/erp/cycle-times", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to save lookup.");
      setSaving(false);
      return;
    }

    setSuccess("Saved. The lookup is now live for the intake form.");
    setSaving(false);
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>Add or update a lookup</h2>
        <span className="pill green">Upsert by bucket</span>
      </div>
      <div className="card-pad">
        <div className="module-note" style={{ marginBottom: 12 }}>
          One row per (material × process × complexity × diameter) bucket. Saving the same
          bucket again updates the estimate — review counter and last-reviewed timestamp move
          forward automatically.
        </div>
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-grid two-col">
            <label>
              Material
              <select className="select" name="materialCategory" required>
                <option value="">Select material</option>
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
                <option value="">Select process</option>
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
                <option value="">Select complexity</option>
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
              Setup hours
              <input
                className="input"
                type="number"
                step="0.01"
                min={0}
                max={999}
                name="estimatedSetupHours"
                required
              />
            </label>
            <label>
              Cycle minutes per piece
              <input
                className="input"
                type="number"
                step="0.001"
                min={0}
                max={99999}
                name="estimatedCycleMinutes"
                required
              />
            </label>
            <label>
              Sample size (historical jobs)
              <input
                className="input"
                type="number"
                step="1"
                min={0}
                max={1000000}
                name="sampleSize"
              />
            </label>
            <label>
              Confidence (0–1)
              <input
                className="input"
                type="number"
                step="0.01"
                min={0}
                max={1}
                name="confidenceScore"
                placeholder="e.g. 0.85"
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Notes
              <textarea
                className="textarea"
                name="notes"
                maxLength={2000}
                placeholder="Calibration source, tooling caveats, etc. Text only."
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
            {saving ? "Saving…" : "Save lookup"}
          </button>
        </form>
      </div>
    </section>
  );
}
