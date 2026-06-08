import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";
import { daysUntil, fmtDate, pmDueBucket } from "@/lib/maintenance";
import { MaintenanceSubnav } from "../maintenance-subnav";
import { PmCompleteButton } from "./pm-complete-form";

export const dynamic = "force-dynamic";

const FREQ_OPTIONS = ["daily", "weekly", "monthly", "quarterly", "annual"].map((v) => ({ label: v, value: v }));

type PmRow = {
  id: string;
  machineId: string;
  title: string;
  frequency: string;
  estMinutes: number;
  nextDueAt: Date | null;
  lastDoneAt: Date | null;
};

export default async function MaintenancePmPage() {
  const user = await requirePermission("maintenance:view");
  const canManage = user.permissions.includes("maintenance:manage");
  const now = new Date();

  const [machines, pms] = await Promise.all([
    prisma.machine.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: [{ building: "asc" }, { code: "asc" }],
      select: { id: true, code: true, name: true },
      take: 1000
    }),
    prisma.pmTask.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, status: "ACTIVE" },
      orderBy: { nextDueAt: "asc" },
      take: 2000
    })
  ]);

  const mById = new Map(machines.map((m) => [m.id, m]));
  const machineOptions = machines.map((m) => ({ label: `${m.code} · ${m.name}`, value: m.id }));

  const buckets: Record<string, PmRow[]> = { overdue: [], today: [], week: [], later: [], none: [] };
  for (const p of pms) buckets[pmDueBucket(p.nextDueAt, now)].push(p);

  const GROUPS: Array<{ key: string; label: string }> = [
    { key: "overdue", label: "⚠ Overdue" },
    { key: "today", label: "Due today" },
    { key: "week", label: "This week" },
    { key: "later", label: "Later" }
  ];

  function table(rows: PmRow[]) {
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Machine</th>
            <th>Task</th>
            <th>Freq</th>
            <th style={{ textAlign: "right" }}>Mins</th>
            <th>Next due</th>
            <th>Last done</th>
            {canManage ? <th>Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const d = daysUntil(p.nextDueAt, now);
            const late = d !== null && d < 0;
            return (
              <tr key={p.id}>
                <td>{mById.get(p.machineId)?.code ?? "—"}</td>
                <td>{p.title}</td>
                <td>{p.frequency}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.estMinutes}</td>
                <td>
                  <span className={`pill ${late ? "red" : d !== null && d <= 7 ? "amber" : ""}`}>
                    {late ? `${Math.abs(d as number)}d late` : fmtDate(p.nextDueAt)}
                  </span>
                </td>
                <td>{fmtDate(p.lastDoneAt)}</td>
                {canManage ? (
                  <td>
                    <PmCompleteButton id={p.id} />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Maintenance · Preventive</p>
          <h1>PM Schedule</h1>
          <p className="subhead">
            {pms.length} active tasks · {buckets.overdue.length} overdue · {buckets.today.length} today · {buckets.week.length} this week. Checking off a task logs it and rolls the next due date.
          </p>
        </div>
      </div>

      <MaintenanceSubnav active="pm" />

      {canManage ? (
        <div style={{ marginBottom: 14 }}>
          <ErpCreateForm
            title="Add PM task"
            endpoint="/api/maintenance/pm"
            fields={[
              { name: "machineId", label: "Machine", type: "select", required: true, options: machineOptions },
              { name: "title", label: "Task", required: true },
              { name: "frequency", label: "Frequency", type: "select", options: FREQ_OPTIONS, defaultValue: "monthly" },
              { name: "estMinutes", label: "Est. minutes", type: "number", defaultValue: 30 },
              { name: "nextDueAt", label: "First due", type: "date" }
            ]}
          />
        </div>
      ) : null}

      {pms.length === 0 ? (
        <section className="card">
          <div className="empty">No PM tasks yet. Load the baseline from the Overview tab, or add tasks above.</div>
        </section>
      ) : (
        GROUPS.filter((g) => buckets[g.key].length > 0).map((g) => (
          <section className="card" key={g.key} style={{ marginBottom: 14 }}>
            <div className="section-title">
              <h2>{g.label}</h2>
              <span className="pill">{buckets[g.key].length}</span>
            </div>
            {table(buckets[g.key])}
          </section>
        ))
      )}
    </>
  );
}
