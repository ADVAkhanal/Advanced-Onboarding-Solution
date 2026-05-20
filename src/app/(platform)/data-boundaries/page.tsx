import { ShieldAlert } from "lucide-react";
import { DISCLAIMER, ENCLAVE_COMPATIBLE_STATEMENT } from "@/lib/reference-data";

export default function DataBoundariesPage() {
  const prohibited = [
    "CUI or ITAR-controlled technical data",
    "payment-card data or bank account/routing numbers",
    "full SSNs, tax credentials, or payroll processor passwords",
    "medical records or PHI",
    "API keys, production secrets, passwords, or cybersecurity secrets",
    "formal CMMC, SSP, POA&M, PCI, or compliance evidence packets"
  ];

  const allowed = [
    "department tickets and operational requests",
    "onboarding cases using safe profile fields",
    "payroll coordination requests without banking, tax, or SSN fields",
    "time-off, attendance, schedule issue, approval, and checklist records",
    "manager notes, tasks, and non-sensitive employee lifecycle summaries",
    "CSV/report exports limited by role and department scope"
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Data Boundaries</p>
          <h1>Safe-use rules for CleanOps</h1>
          <p className="subhead">CleanOps is an internal operations command center. It is enclave-compatible by design, but it is not an enclave provider and does not claim regulated-data compliance.</p>
        </div>
      </div>

      <section className="card">
        <div className="section-title"><h2>Visible Boundary Statement</h2><ShieldAlert className="tone-red" size={20} /></div>
        <div className="card-pad">
          <p className="subhead">{DISCLAIMER}</p>
          <p className="subhead">{ENCLAVE_COMPATIBLE_STATEMENT}</p>
        </div>
      </section>

      <div className="grid two-col" style={{ marginTop: 14 }}>
        <section className="card">
          <div className="section-title"><h2>Allowed Operational Data</h2><span className="pill green">MVP scope</span></div>
          <div className="card-pad"><ul className="compact-list">{allowed.map((item) => <li key={item}><span>{item}</span><strong>Allowed</strong></li>)}</ul></div>
        </section>

        <section className="card">
          <div className="section-title"><h2>Do Not Enter</h2><span className="pill red">Prohibited</span></div>
          <div className="card-pad"><ul className="compact-list">{prohibited.map((item) => <li key={item}><span>{item}</span><strong>Blocked by policy</strong></li>)}</ul></div>
        </section>
      </div>
    </>
  );
}
