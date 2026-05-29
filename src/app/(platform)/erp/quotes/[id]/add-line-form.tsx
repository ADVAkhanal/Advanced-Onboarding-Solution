"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { estimateLine } from "@/lib/quoting";

type Lookup = {
  id: string;
  materialCategory: string;
  process: string;
  complexityClass: string;
  diameterClass: string;
  estimatedSetupHours: number;
  estimatedCycleMinutes: number;
};

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

function num(value: FormDataEntryValue | null): number {
  if (value === null) return 0;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : 0;
}

export function AddLineForm({
  quoteId,
  lookups
}: {
  quoteId: string;
  lookups: Lookup[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [bucket, setBucket] = useState({
    materialCategory: "",
    process: "",
    complexityClass: "",
    diameterClass: "NOT_APPLICABLE"
  });
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);

  const matchedLookup =
    bucket.materialCategory && bucket.process && bucket.complexityClass
      ? lookups.find(
          (l) =>
            l.materialCategory === bucket.materialCategory &&
            l.process === bucket.process &&
            l.complexityClass === bucket.complexityClass &&
            l.diameterClass === bucket.diameterClass
        ) ?? null
      : null;

  function recompute(form: HTMLFormElement) {
    const data = new FormData(form);
    const setupRaw = str(data.get("setupHours"));
    const cycleRaw = str(data.get("cycleMinutesPerPiece"));
    const estimate = estimateLine({
      quantity: num(data.get("quantity")),
      setupHours: setupRaw ? num(setupRaw) : matchedLookup?.estimatedSetupHours ?? 0,
      cycleMinutesPerPiece: cycleRaw
        ? num(cycleRaw)
        : matchedLookup?.estimatedCycleMinutes ?? 0,
      materialCostPerUnit: num(data.get("materialCostPerUnit")),
      laborRatePerHour: num(data.get("laborRatePerHour")),
      burdenRatePerHour: num(data.get("burdenRatePerHour")),
      marginPercent: num(data.get("marginPercent"))
    });
    setPreviewTotal(estimate.total);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);

    const payload = {
      partDescription: str(data.get("partDescription")),
      quantity: num(data.get("quantity")) || 1,
      materialCategory: str(data.get("materialCategory")),
      process: str(data.get("process")),
      complexityClass: str(data.get("complexityClass")),
      diameterClass: str(data.get("diameterClass")) || "NOT_APPLICABLE",
      setupHours: str(data.get("setupHours")) ? num(data.get("setupHours")) : undefined,
      cycleMinutesPerPiece: str(data.get("cycleMinutesPerPiece"))
        ? num(data.get("cycleMinutesPerPiece"))
        : undefined,
      materialCostPerUnit: str(data.get("materialCostPerUnit"))
        ? num(data.get("materialCostPerUnit"))
        : undefined,
      laborRatePerHour: str(data.get("laborRatePerHour"))
        ? num(data.get("laborRatePerHour"))
        : undefined,
      burdenRatePerHour: str(data.get("burdenRatePerHour"))
        ? num(data.get("burdenRatePerHour"))
        : undefined,
      marginPercent: str(data.get("marginPercent")) ? num(data.get("marginPercent")) : undefined,
      cycleTimeLookupId: matchedLookup?.id,
      routingNotes: str(data.get("routingNotes")) || undefined
    };

    const response = await fetch(`/api/erp/quotes/${quoteId}/lines`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to add line.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="button" onClick={() => setOpen(true)}>
        + Add line
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      onChange={(event) => recompute(event.currentTarget)}
      className="form-grid"
      style={{ marginTop: 12 }}
    >
      <div className="module-note">
        Add a part line to this quote. Setup / cycle pre-fill from the matching cycle-time
        lookup when material + process + complexity match; type to override. No CUI, alloy
        specs, or drawing references.
      </div>
      <div className="form-grid two-col">
        <label style={{ gridColumn: "1 / -1" }}>
          Part description
          <textarea
            className="textarea"
            name="partDescription"
            required
            minLength={3}
            maxLength={500}
          />
        </label>
        <label>
          Quantity
          <input
            className="input"
            type="number"
            min={1}
            step={1}
            name="quantity"
            required
            defaultValue={1}
          />
        </label>
        <label>
          Material
          <select
            className="select"
            name="materialCategory"
            required
            onChange={(e) => setBucket((b) => ({ ...b, materialCategory: e.target.value }))}
          >
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
          <select
            className="select"
            name="process"
            required
            onChange={(e) => setBucket((b) => ({ ...b, process: e.target.value }))}
          >
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
          <select
            className="select"
            name="complexityClass"
            required
            onChange={(e) => setBucket((b) => ({ ...b, complexityClass: e.target.value }))}
          >
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
          <select
            className="select"
            name="diameterClass"
            defaultValue="NOT_APPLICABLE"
            onChange={(e) => setBucket((b) => ({ ...b, diameterClass: e.target.value }))}
          >
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
            name="setupHours"
            placeholder={matchedLookup ? `${matchedLookup.estimatedSetupHours} (lookup)` : "Hours"}
          />
        </label>
        <label>
          Cycle min/pc
          <input
            className="input"
            type="number"
            step="0.001"
            min={0}
            name="cycleMinutesPerPiece"
            placeholder={
              matchedLookup ? `${matchedLookup.estimatedCycleMinutes} (lookup)` : "Minutes"
            }
          />
        </label>
        <label>
          Material $/unit
          <input className="input" type="number" step="0.0001" min={0} name="materialCostPerUnit" />
        </label>
        <label>
          Labor $/hr
          <input className="input" type="number" step="0.01" min={0} name="laborRatePerHour" />
        </label>
        <label>
          Burden $/hr
          <input className="input" type="number" step="0.01" min={0} name="burdenRatePerHour" />
        </label>
        <label>
          Margin %
          <input className="input" type="number" step="0.1" min={0} max={95} name="marginPercent" />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Routing notes
          <textarea className="textarea" name="routingNotes" maxLength={2000} />
        </label>
      </div>

      {previewTotal !== null ? (
        <div className="pill" aria-live="polite">
          Line total preview: ${previewTotal.toFixed(2)}
          {matchedLookup ? " · lookup matched" : ""}
        </div>
      ) : null}
      {error ? (
        <div className="pill red" role="alert">
          {error}
        </div>
      ) : null}

      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? "Adding…" : "Add line to quote"}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setOpen(false)}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
