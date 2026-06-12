"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SHIFTS = ["DAY", "EVENING", "NIGHT"];
const STATUSES = ["RUNNING", "DOWN", "SETUP", "IDLE", "COMPLETE"];

type MachineOption = { code: string; name: string };

type EntryDraft = {
  machineCode: string;
  woNumber: string;
  status: string;
  partsMade: string;
  partsTarget: string;
  notes: string;
};

const emptyEntry = (): EntryDraft => ({
  machineCode: "",
  woNumber: "",
  status: "RUNNING",
  partsMade: "",
  partsTarget: "",
  notes: ""
});

function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** End-of-shift handoff form: shift header + one row per machine. */
export function HandoffForm({ machines }: { machines: MachineOption[] }) {
  const router = useRouter();
  const [shift, setShift] = useState("DAY");
  const [shiftDate, setShiftDate] = useState(todayLocal());
  const [operators, setOperators] = useState("");
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<EntryDraft[]>([emptyEntry()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setEntry(i: number, patch: Partial<EntryDraft>) {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const filled = entries.filter((e) => e.machineCode.trim());
    if (filled.length === 0) {
      setError("Add at least one machine entry.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      shift,
      shiftDate,
      operators: operators.trim() || undefined,
      notes: notes.trim() || undefined,
      entries: filled.map((e) => ({
        machineCode: e.machineCode,
        woNumber: e.woNumber.trim() || undefined,
        status: e.status,
        partsMade: e.partsMade.trim() === "" ? undefined : Number(e.partsMade),
        partsTarget: e.partsTarget.trim() === "" ? undefined : Number(e.partsTarget),
        notes: e.notes.trim() || undefined
      }))
    };

    const response = await fetch("/api/shift-handoff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to submit handoff.");
      return;
    }
    const downCount = filled.filter((e) => e.status === "DOWN").length;
    setSuccess(
      `Handoff submitted (${filled.length} machine entr${filled.length === 1 ? "y" : "ies"}${downCount ? `, ${downCount} reported DOWN — maintenance board updated` : ""}).`
    );
    setEntries([emptyEntry()]);
    setOperators("");
    setNotes("");
    router.refresh();
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>Submit end-of-shift handoff</h2>
        <span className="pill green">Server validated</span>
      </div>
      <div className="card-pad">
        <div className="module-note" style={{ marginBottom: 12 }}>
          One entry per machine you ran this shift. Machines reported DOWN update the maintenance
          board automatically. Text only — no CUI, drawings, or process parameters.
        </div>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid two-col">
            <label>
              Shift
              <select className="select" value={shift} onChange={(e) => setShift(e.target.value)}>
                {SHIFTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Shift date
              <input className="input" type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} required />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Operators on shift
              <input className="input" value={operators} onChange={(e) => setOperators(e.target.value)} placeholder="Names, comma separated" maxLength={400} />
            </label>
          </div>

          {entries.map((entry, i) => (
            <fieldset key={i} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
              <legend style={{ fontSize: 12, fontWeight: 600, padding: "0 6px" }}>Machine entry {i + 1}</legend>
              <div className="form-grid two-col">
                <label>
                  Machine / work center
                  <select className="select" value={entry.machineCode} onChange={(e) => setEntry(i, { machineCode: e.target.value })}>
                    <option value="">Select machine</option>
                    {machines.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.code} · {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select className="select" value={entry.status} onChange={(e) => setEntry(i, { status: e.target.value })}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Work order #
                  <input className="input" value={entry.woNumber} onChange={(e) => setEntry(i, { woNumber: e.target.value })} maxLength={60} />
                </label>
                <label>
                  Parts made / target
                  <span style={{ display: "flex", gap: 6 }}>
                    <input className="input" type="number" min={0} value={entry.partsMade} onChange={(e) => setEntry(i, { partsMade: e.target.value })} placeholder="made" aria-label="Parts made" />
                    <input className="input" type="number" min={0} value={entry.partsTarget} onChange={(e) => setEntry(i, { partsTarget: e.target.value })} placeholder="target" aria-label="Parts target" />
                  </span>
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  Entry notes
                  <input className="input" value={entry.notes} onChange={(e) => setEntry(i, { notes: e.target.value })} maxLength={2000} placeholder="Tooling, offsets left, next-op heads-up…" />
                </label>
              </div>
              {entries.length > 1 ? (
                <button className="button" type="button" onClick={() => setEntries((prev) => prev.filter((_, idx) => idx !== i))} style={{ marginTop: 8 }}>
                  Remove entry
                </button>
              ) : null}
            </fieldset>
          ))}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="button" type="button" onClick={() => setEntries((prev) => [...prev, emptyEntry()])}>
              + Add machine entry
            </button>
          </div>

          <label>
            Shift notes (general)
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} placeholder="Anything the next shift needs to know." />
          </label>

          {error ? <div className="pill red" role="alert">{error}</div> : null}
          {success ? <div className="pill green" role="status">{success}</div> : null}
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? "Submitting…" : "Submit handoff"}
          </button>
        </form>
      </div>
    </section>
  );
}
