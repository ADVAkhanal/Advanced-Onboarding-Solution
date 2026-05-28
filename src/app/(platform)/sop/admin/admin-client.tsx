"use client";

import { useMemo, useState } from "react";

type DocumentRow = {
  id: string;
  documentKey: string;
  title: string;
  departmentId: string | null;
  visibility: string;
  safetyCritical: boolean;
  qualityCritical: boolean;
  customerImpacting: boolean;
  updatedAt: string;
};

type VersionRow = {
  id: string;
  documentId: string;
  versionNumber: number;
  approvalStatus: string;
  changeSummary: string | null;
  createdAt: string;
  approvedAt: string | null;
};

type DepartmentRow = { id: string; name: string; code: string };

type Props = {
  documents: DocumentRow[];
  versions: VersionRow[];
  departments: DepartmentRow[];
  canApprove: boolean;
};

const VISIBILITIES = ["ALL_USERS", "DEPARTMENT", "MANAGER_PLUS", "DIRECTOR_PLUS", "ADMIN_ONLY"] as const;

export function SopAdminClient({ documents, versions, departments, canApprove }: Props) {
  const [tab, setTab] = useState<"library" | "new">("library");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // New-document form state
  const [documentKey, setDocumentKey] = useState("");
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [visibility, setVisibility] = useState<(typeof VISIBILITIES)[number]>("ALL_USERS");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [safetyCritical, setSafetyCritical] = useState(false);
  const [qualityCritical, setQualityCritical] = useState(false);
  const [customerImpacting, setCustomerImpacting] = useState(false);
  const [rawText, setRawText] = useState("");
  const [changeSummary, setChangeSummary] = useState("");

  const filteredVersions = useMemo(() => {
    if (statusFilter === "ALL") return versions;
    return versions.filter((v) => v.approvalStatus === statusFilter);
  }, [versions, statusFilter]);

  const versionsByDoc = useMemo(() => {
    const map = new Map<string, VersionRow[]>();
    for (const v of filteredVersions) {
      const arr = map.get(v.documentId) ?? [];
      arr.push(v);
      map.set(v.documentId, arr);
    }
    return map;
  }, [filteredVersions]);

  const submitDraft = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/sop/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentKey,
          title,
          category: category || undefined,
          departmentId: departmentId || undefined,
          visibility,
          safetyCritical,
          qualityCritical,
          customerImpacting,
          summary: summary || undefined,
          rawText,
          changeSummary: changeSummary || undefined
        })
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Could not save draft.");
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const decide = async (versionId: string, decision: "APPROVE" | "REJECT" | "SUBMIT_FOR_REVIEW") => {
    setBusy(true);
    setError(null);
    try {
      const reason =
        decision === "REJECT" ? window.prompt("Reason for rejecting this version?") ?? "" : undefined;
      const response = await fetch(`/api/sop/documents/${versionId}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason })
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Could not record decision.");
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad">
      <div className="tabs" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={`button ${tab === "library" ? "primary" : ""}`}
          onClick={() => setTab("library")}
        >
          Library
        </button>
        <button
          type="button"
          className={`button ${tab === "new" ? "primary" : ""}`}
          onClick={() => setTab("new")}
        >
          New draft / new version
        </button>
      </div>

      {error ? (
        <div className="callout red" style={{ marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {tab === "library" ? (
        <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <label htmlFor="sop-status-filter">Filter by status</label>
            <select
              id="sop-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {["ALL", "DRAFT", "IN_REVIEW", "APPROVED", "SUPERSEDED", "REJECTED"].map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Key</th>
                <th>Dept</th>
                <th>Visibility</th>
                <th>Flags</th>
                <th>Versions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const docVersions = versionsByDoc.get(doc.id) ?? [];
                const dept = departments.find((d) => d.id === doc.departmentId);
                return (
                  <tr key={doc.id}>
                    <td>
                      <strong>{doc.title}</strong>
                    </td>
                    <td>
                      <code>{doc.documentKey}</code>
                    </td>
                    <td>{dept?.name ?? "—"}</td>
                    <td>{doc.visibility}</td>
                    <td>
                      {[
                        doc.safetyCritical ? "SAFETY" : null,
                        doc.qualityCritical ? "QUALITY" : null,
                        doc.customerImpacting ? "CUSTOMER" : null
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td>
                      {docVersions.length === 0 ? (
                        <span className="metric-note">No versions in this filter.</span>
                      ) : (
                        <ul className="compact-list">
                          {docVersions.map((v) => (
                            <li key={v.id}>
                              <strong>v{v.versionNumber}</strong> — {v.approvalStatus}
                              {v.changeSummary ? (
                                <span className="metric-note"> — {v.changeSummary}</span>
                              ) : null}
                              <div style={{ display: "inline-flex", gap: 6, marginLeft: 8 }}>
                                {v.approvalStatus === "DRAFT" ? (
                                  <button
                                    type="button"
                                    className="button"
                                    disabled={busy}
                                    onClick={() => decide(v.id, "SUBMIT_FOR_REVIEW")}
                                  >
                                    Submit
                                  </button>
                                ) : null}
                                {canApprove && (v.approvalStatus === "DRAFT" || v.approvalStatus === "IN_REVIEW") ? (
                                  <>
                                    <button
                                      type="button"
                                      className="button primary"
                                      disabled={busy}
                                      onClick={() => decide(v.id, "APPROVE")}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      className="button"
                                      disabled={busy}
                                      onClick={() => decide(v.id, "REJECT")}
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : null}

      {tab === "new" ? (
        <form onSubmit={submitDraft}>
          <div className="grid two-col">
            <label>
              <strong>Document key</strong>
              <span className="metric-note">Stable identifier across versions (e.g. <code>qa/fai-process</code>).</span>
              <input
                type="text"
                value={documentKey}
                onChange={(event) => setDocumentKey(event.target.value)}
                required
                maxLength={120}
              />
            </label>
            <label>
              <strong>Title</strong>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={200}
              />
            </label>
            <label>
              <strong>Department</strong>
              <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                <option value="">(all departments)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <strong>Visibility</strong>
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as (typeof VISIBILITIES)[number])}
              >
                {VISIBILITIES.map((v) => (
                  <option key={v} value={v}>
                    {v.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <strong>Category</strong>
              <input type="text" value={category} onChange={(event) => setCategory(event.target.value)} />
            </label>
            <label>
              <strong>Change summary</strong>
              <input
                type="text"
                value={changeSummary}
                onChange={(event) => setChangeSummary(event.target.value)}
                maxLength={2000}
              />
            </label>
          </div>

          <label style={{ display: "block", marginTop: 12 }}>
            <strong>Summary (optional)</strong>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={2}
              maxLength={2000}
            />
          </label>

          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <label>
              <input
                type="checkbox"
                checked={safetyCritical}
                onChange={(event) => setSafetyCritical(event.target.checked)}
              />
              Safety-critical
            </label>
            <label>
              <input
                type="checkbox"
                checked={qualityCritical}
                onChange={(event) => setQualityCritical(event.target.checked)}
              />
              Quality-critical
            </label>
            <label>
              <input
                type="checkbox"
                checked={customerImpacting}
                onChange={(event) => setCustomerImpacting(event.target.checked)}
              />
              Customer-impacting
            </label>
          </div>

          <label style={{ display: "block", marginTop: 12 }}>
            <strong>SOP text</strong>
            <span className="metric-note">
              {" "}
              Markdown headings or numbered sections preferred. Do not paste customer-controlled drawings or
              specifications.
            </span>
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              rows={16}
              required
              minLength={20}
              maxLength={120_000}
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}
            />
          </label>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? "Saving..." : "Save as draft"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
