import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardList, FileDown, Plus, SlidersHorizontal } from "lucide-react";
import type { WorkflowModule } from "@/lib/reference-data";

export function ModuleWorkbench({ module }: { module: WorkflowModule }) {
  const Icon = module.icon;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{module.owner}</p>
          <h1>{module.title}</h1>
          <p className="subhead">{module.summary}</p>
        </div>
        <div className="actions">
          <button className="button primary" type="button">
            <Plus size={18} />
            {module.primaryAction}
          </button>
          <button className="button dark" type="button">
            <BadgeCheck size={18} />
            {module.secondaryAction}
          </button>
          <Link className="button" href="/workflows/reports-exports">
            <FileDown size={18} />
            Export
          </Link>
        </div>
      </div>

      <div className="module-layout">
        <div className="module-hero">
          <div className="grid kpi-grid">
            {module.metricLabels.map((label, index) => (
              <section className="card kpi" key={label}>
                <div className="kpi-top">
                  <div className="metric-label">{label}</div>
                  <div className="icon-disc">
                    <Icon size={20} />
                  </div>
                </div>
                <div>
                  <div className="metric-value">{index === 0 ? "0" : "Ready"}</div>
                  <div className="metric-note">Live from records in scope</div>
                </div>
              </section>
            ))}
          </div>

          <section className="card">
            <div className="section-title">
              <h2>Workflow Board</h2>
              <span className="pill">Owner · Status · Due Date · History</span>
            </div>
            <div className="card-pad status-lanes">
              {module.statuses.slice(0, 8).map((status, index) => (
                <div className="lane" key={status}>
                  <strong>{status}</strong>
                  <ul className="compact-list">
                    <li>
                      <span>{module.workflows[index % module.workflows.length]}</span>
                      <ArrowRight size={14} />
                    </li>
                    <li>
                      <span>Audit history</span>
                      <span className="pill green">On</span>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <div className="grid two-col">
            <section className="card">
              <div className="section-title">
                <h2>Required Record Fields</h2>
                <span className="pill">Normalized</span>
              </div>
              <div className="card-pad field-grid">
                {module.fields.map((field) => (
                  <span className="field-chip" key={field}>{field}</span>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="section-title">
                <h2>Reports</h2>
                <Link className="link" href="/workflows/reports-exports">Report Center</Link>
              </div>
              <div className="card-pad">
                <ul className="compact-list">
                  {module.reports.map((report) => (
                    <li key={report}>
                      <span>{report}</span>
                      <FileDown size={14} />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <section className="card">
            <div className="section-title">
              <h2>Operational Request Intake</h2>
              <span className="pill">Server Validated</span>
            </div>
            <div className="card-pad">
              <div className="form-grid">
                <label>
                  Title
                  <input className="input" placeholder={`${module.primaryAction} title`} />
                </label>
                <label>
                  Owner
                  <input className="input" placeholder="Assign owner" />
                </label>
                <label>
                  Priority
                  <select className="select" defaultValue="Normal">
                    <option>Low</option>
                    <option>Normal</option>
                    <option>High</option>
                    <option>Urgent</option>
                    <option>Work Stoppage</option>
                  </select>
                </label>
                <label>
                  Notes
                  <textarea className="textarea" placeholder="Internal management notes only" />
                </label>
                <button className="button primary" type="button">
                  <Plus size={18} />
                  Submit Through API
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="grid">
          <section className="card">
            <div className="section-title">
              <h2>Controls</h2>
              <SlidersHorizontal size={18} />
            </div>
            <div className="card-pad">
              <ul className="compact-list">
                {module.workflows.map((workflow) => (
                  <li key={workflow}>
                    <span>{workflow}</span>
                    <span className="pill">Active</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="card">
            <div className="section-title">
              <h2>Approval Rules</h2>
              <BadgeCheck size={18} />
            </div>
            <div className="card-pad">
              <ul className="compact-list">
                <li><span>No self-approval</span><span className="pill green">Enforced</span></li>
                <li><span>Owner required</span><span className="pill green">Enforced</span></li>
                <li><span>Audit trail</span><span className="pill green">On</span></li>
                <li><span>Role scope</span><span className="pill green">Server</span></li>
              </ul>
            </div>
          </section>

          <section className="card">
            <div className="section-title">
              <h2>Export Boundary</h2>
              <ClipboardList size={18} />
            </div>
            <div className="card-pad">
              <ul className="compact-list">
                <li><span>PDF</span><span className="pill">Enabled</span></li>
                <li><span>DOCX</span><span className="pill">Enabled</span></li>
                <li><span>XLSX / CSV</span><span className="pill">Safe fields</span></li>
                <li><span>JSON / HTML / Markdown</span><span className="pill">Enabled</span></li>
              </ul>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
