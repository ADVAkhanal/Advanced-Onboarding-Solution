"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { estimateLine, type LineEstimate } from "@/lib/quoting";

type Lookup = {
  id: string;
  materialCategory: string;
  process: string;
  complexityClass: string;
  diameterClass: string;
  estimatedSetupHours: number;
  estimatedCycleMinutes: number;
  sampleSize: number;
  confidenceScore: number | null;
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

function num(value: FormDataEntryValue | null): number {
  if (value === null) return 0;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : 0;
}

function str(value: FormDataEntryValue | null): string {
  return value === null ? "" : String(value).trim();
}

export function QuoteIntakeForm({
  customers,
  lookups
}: {
  customers: Array<{ label: string; value: string }>;
  lookups: Lookup[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Live preview state — recomputed on every input change. Server still
  // re-runs estimateLine() at submit so the persisted figures match the
  // canonical formula.
  const [preview, setPreview] = useState<{
    estimate: LineEstimate;
    matchedLookup: Lookup | null;
  } | null>(null);

  const [filters, setFilters] = useState({
    materialCategory: "",
    process: "",
    complexityClass: "",
    diameterClass: "NOT_APPLICABLE"
  });

  const matchedLookup = useMemo(() => {
    if (!filters.materialCategory || !filters.process || !filters.complexityClass) {
      return null;
    }
    return (
      lookups.find(
        (l) =>
          l.materialCategory === filters.materialCategory &&
          l.process === filters.process &&
          l.complexityClass === filters.complexityClass &&
          l.diameterClass === filters.diameterClass
      ) ?? null
    );
  }, [filters, lookups]);

  function recomputePreview(form: HTMLFormElement) {
    const data = new FormData(form);
    const setupHoursInput = str(data.get("setupHours"));
    const cycleMinutesInput = str(data.get("cycleMinutesPerPiece"));
    const setupHours = setupHoursInput
      ? num(setupHoursInput)
      : matchedLookup?.estimatedSetupHours ?? 0;
    const cycleMinutesPerPiece = cycleMinutesInput
      ? num(cycleMinutesInput)
      : matchedLookup?.estimatedCycleMinutes ?? 0;
    const estimate = estimateLine({
      quantity: num(data.get("quantity")),
      setupHours,
      cycleMinutesPerPiece,
      materialCostPerUnit: num(data.get("materialCostPerUnit")),
      laborRatePerHour: num(data.get("laborRatePerHour")),
      burdenRatePerHour: num(data.get("burdenRatePerHour")),
      marginPercent: num(data.get("marginPercent"))
    });
    setPreview({ estimate, matchedLookup });
  }

  function onFieldChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
    recomputePreview(event.currentTarget.form as HTMLFormElement);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const data = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      customerId: str(data.get("customerId")) || undefined,
      title: str(data.get("title")),
      dueDate: str(data.get("dueDate"))
        ? new Date(`${str(data.get("dueDate"))}T00:00:00`).toISOString()
        : undefined,
      validUntil: str(data.get("validUntil"))
        ? new Date(`${str(data.get("validUntil"))}T00:00:00`).toISOString()
        : undefined,
      priority: str(data.get("priority")) || "NORMAL",
      notes: str(data.get("notes")) || undefined,
      partNumber: str(data.get("partNumber")) || undefined,
      partDescription: str(data.get("partDescription")),
      revision: str(data.get("revision")) || undefined,
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
      routingNotes: str(data.get("routingNotes")) || undefined,
      exportControlFlag: data.get("exportControlFlag") === "on"
    };

    const response = await fetch("/api/erp/quotes/manufacturing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to create quote.");
      setSaving(false);
      return;
    }

    router.push("/erp/quotes");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      onChange={(event) => recomputePreview(event.currentTarget)}
      className="grid"
      style={{ gap: 14 }}
    >
      <section className="card">
        <div className="section-title">
          <h2>Customer &amp; Header</h2>
          <span className="pill">Step 1</span>
        </div>
        <div className="card-pad">
          <div className="module-note" style={{ marginBottom: 12 }}>
            Do not enter CUI, ITAR-controlled drawing data, alloy spec numbers, SSNs, banking,
            cards, medical, passwords, API keys, or secrets. Use the export-control flag below
            when a part will require additional review off-platform.
          </div>
          <div className="form-grid two-col">
            <label>
              Customer
              <select className="select" name="customerId">
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.value} value={customer.value}>
                    {customer.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quote title
              <input
                className="input"
                name="title"
                required
                minLength={3}
                maxLength={180}
                placeholder="e.g. 5/16 turn-and-grind shaft, qty 250"
              />
            </label>
            <label>
              Due date
              <input className="input" type="date" name="dueDate" />
            </label>
            <label>
              Valid until
              <input className="input" type="date" name="validUntil" />
            </label>
            <label>
              Priority
              <select className="select" name="priority" defaultValue="NORMAL">
                {["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"].map((p) => (
                  <option key={p} value={p}>
                    {p.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="exportControlFlag" />
                Export-controlled (ITAR / EAR) — flag only, no controlled data on platform
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Part &amp; Routing</h2>
          <span className="pill">Step 2</span>
        </div>
        <div className="card-pad">
          <div className="form-grid two-col">
            <label>
              Part number
              <input className="input" name="partNumber" maxLength={60} />
            </label>
            <label>
              Revision
              <input className="input" name="revision" maxLength={20} defaultValue="A" />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Part description
              <textarea
                className="textarea"
                name="partDescription"
                required
                minLength={3}
                maxLength={500}
                placeholder="Plain-language description. No alloy specs, no drawing references."
              />
            </label>
            <label>
              Quantity
              <input
                className="input"
                type="number"
                min={1}
                max={1000000}
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
                onChange={onFieldChange}
              >
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
              <select className="select" name="process" required onChange={onFieldChange}>
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
              <select
                className="select"
                name="complexityClass"
                required
                onChange={onFieldChange}
              >
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
              <select
                className="select"
                name="diameterClass"
                defaultValue="NOT_APPLICABLE"
                onChange={onFieldChange}
              >
                {DIAMETERS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Routing notes
              <textarea
                className="textarea"
                name="routingNotes"
                maxLength={2000}
                placeholder="Setup steps, fixtures, tool list, finishing — text only."
              />
            </label>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Cycle Time &amp; Cost</h2>
          {matchedLookup ? (
            <span className="pill green">
              Lookup match · n={matchedLookup.sampleSize}
            </span>
          ) : filters.materialCategory && filters.process && filters.complexityClass ? (
            <span className="pill amber">No lookup match · enter manually</span>
          ) : (
            <span className="pill">Select material + process + complexity</span>
          )}
        </div>
        <div className="card-pad">
          <div className="form-grid two-col">
            <label>
              Setup hours
              <input
                className="input"
                type="number"
                step="0.01"
                min={0}
                name="setupHours"
                placeholder={
                  matchedLookup
                    ? `${matchedLookup.estimatedSetupHours} (from lookup)`
                    : "Hours"
                }
              />
            </label>
            <label>
              Cycle minutes per piece
              <input
                className="input"
                type="number"
                step="0.001"
                min={0}
                name="cycleMinutesPerPiece"
                placeholder={
                  matchedLookup
                    ? `${matchedLookup.estimatedCycleMinutes} (from lookup)`
                    : "Minutes"
                }
              />
            </label>
            <label>
              Material cost per unit ($)
              <input
                className="input"
                type="number"
                step="0.0001"
                min={0}
                name="materialCostPerUnit"
              />
            </label>
            <label>
              Labor rate per hour ($)
              <input
                className="input"
                type="number"
                step="0.01"
                min={0}
                name="laborRatePerHour"
              />
            </label>
            <label>
              Burden rate per hour ($)
              <input
                className="input"
                type="number"
                step="0.01"
                min={0}
                name="burdenRatePerHour"
              />
            </label>
            <label>
              Margin %
              <input
                className="input"
                type="number"
                step="0.1"
                min={0}
                max={95}
                name="marginPercent"
                placeholder="e.g. 25"
              />
            </label>
          </div>

          {preview ? (
            <div className="grid two-col" style={{ marginTop: 14, gap: 14 }}>
              <div className="card" style={{ padding: 12 }}>
                <p className="eyebrow" style={{ marginBottom: 6 }}>
                  Live estimate
                </p>
                <table className="table">
                  <tbody>
                    <tr>
                      <th scope="row">Total hours</th>
                      <td className="td-numeric">{preview.estimate.totalHours.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Labor</th>
                      <td className="td-numeric">
                        ${preview.estimate.laborCost.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Burden</th>
                      <td className="td-numeric">
                        ${preview.estimate.burdenCost.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Material</th>
                      <td className="td-numeric">
                        ${preview.estimate.materialCost.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Subtotal</th>
                      <td className="td-numeric">${preview.estimate.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Margin</th>
                      <td className="td-numeric">
                        ${preview.estimate.marginAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">
                        <strong>Quote total</strong>
                      </th>
                      <td className="td-numeric">
                        <strong>${preview.estimate.total.toFixed(2)}</strong>
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Unit price</th>
                      <td className="td-numeric">
                        ${preview.estimate.unitPrice.toFixed(4)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {preview.matchedLookup ? (
                <div className="card" style={{ padding: 12 }}>
                  <p className="eyebrow" style={{ marginBottom: 6 }}>
                    Matched lookup
                  </p>
                  <p>
                    Setup: <strong>{preview.matchedLookup.estimatedSetupHours} h</strong>
                    <br />
                    Cycle:{" "}
                    <strong>{preview.matchedLookup.estimatedCycleMinutes} min/pc</strong>
                    <br />
                    Sample size: <strong>{preview.matchedLookup.sampleSize}</strong>
                    {preview.matchedLookup.confidenceScore != null ? (
                      <>
                        <br />
                        Confidence:{" "}
                        <strong>
                          {(preview.matchedLookup.confidenceScore * 100).toFixed(0)}%
                        </strong>
                      </>
                    ) : null}
                  </p>
                  <p className="metric-note">
                    Leave setup / cycle blank above to use these defaults. Type a value to
                    override.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Internal Notes</h2>
        </div>
        <div className="card-pad">
          <textarea className="textarea" name="notes" maxLength={5000} />
        </div>
      </section>

      {error ? (
        <div className="pill red" role="alert">
          {error}
        </div>
      ) : null}

      <div className="actions">
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create draft quote"}
        </button>
      </div>
    </form>
  );
}
