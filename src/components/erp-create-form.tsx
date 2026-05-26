"use client";

import { useState } from "react";

export type ErpField = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "textarea" | "select";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number;
};

function normalizeValue(field: ErpField, value: FormDataEntryValue | null) {
  if (value === null) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  if (field.type === "number") return Number(raw);
  if (field.type === "date") return new Date(`${raw}T00:00:00`).toISOString();
  return raw;
}

export function ErpCreateForm({
  title,
  endpoint,
  fields,
  compact = false
}: {
  title: string;
  endpoint: string;
  fields: ErpField[];
  compact?: boolean;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(
      fields
        .map((field) => [field.name, normalizeValue(field, formData.get(field.name))])
        .filter(([, value]) => value !== undefined)
    );

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to create record.");
      setSaving(false);
      return;
    }

    window.location.href = window.location.pathname;
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>{title}</h2>
        <span className="pill green">Server validated</span>
      </div>
      <div className="card-pad">
        <div className="module-note" style={{ marginBottom: 12 }}>
          Do not enter CUI, ITAR data, SSNs, banking details, card data, medical records, tax credentials, passwords, API keys, or secrets.
        </div>
        <form onSubmit={submit} className="form-grid">
          <div className={compact ? "form-grid" : "form-grid two-col"}>
            {fields.map((field) => (
              <label key={field.name}>
                {field.label}
                {field.type === "textarea" ? (
                  <textarea className="textarea" name={field.name} required={field.required} defaultValue={field.defaultValue} />
                ) : field.type === "select" ? (
                  <select className="select" name={field.name} required={field.required} defaultValue={field.defaultValue ?? ""}>
                    <option value="">Select</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input"
                    name={field.name}
                    type={field.type ?? "text"}
                    required={field.required}
                    defaultValue={field.defaultValue}
                  />
                )}
              </label>
            ))}
          </div>
          {error ? <div className="pill red">{error}</div> : null}
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create Record"}
          </button>
        </form>
      </div>
    </section>
  );
}
