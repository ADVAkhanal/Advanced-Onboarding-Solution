"use client";

import { useMemo, useState } from "react";

type Quiz = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  departmentId: string | null;
  categoryId: string | null;
  status: string;
  questionCount: number;
  passThreshold: number;
};

type Category = { id: string; name: string; slug: string };
type Department = { id: string; name: string; code: string };
type ShareLink = {
  id: string;
  token: string;
  quizId: string;
  label: string | null;
  usageCount: number;
  expiresAt: string | null;
  active: boolean;
};

type Props = {
  quizzes: Quiz[];
  bankSize: number;
  categories: Category[];
  departments: Department[];
  links: ShareLink[];
};

export function TrainingAdminClient({ quizzes, bankSize, categories, departments, links }: Props) {
  const [tab, setTab] = useState<"quizzes" | "newQuiz" | "newQuestion" | "share">("quizzes");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Quiz form
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [questionCount, setQuestionCount] = useState(10);
  const [passThreshold, setPassThreshold] = useState(80);
  const [pickStrategy, setPickStrategy] = useState("random_balanced");

  // Question form
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState("");
  const [questionCategoryId, setQuestionCategoryId] = useState<string>("");
  const [questionDepartmentId, setQuestionDepartmentId] = useState<string>("");
  const [safetyCritical, setSafetyCritical] = useState(false);
  const [qualityCritical, setQualityCritical] = useState(false);
  const [options, setOptions] = useState<Array<{ label: string; isCorrect: boolean }>>([
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false }
  ]);

  // Share form
  const [shareQuizId, setShareQuizId] = useState<string>("");
  const [shareLabel, setShareLabel] = useState("");
  const [shareExpiresAt, setShareExpiresAt] = useState<string>("");

  const linksByQuiz = useMemo(() => {
    const map = new Map<string, ShareLink[]>();
    for (const link of links) {
      const list = map.get(link.quizId) ?? [];
      list.push(link);
      map.set(link.quizId, list);
    }
    return map;
  }, [links]);

  const publish = async (quizId: string) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/training/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body?.error?.message ?? "Could not publish quiz.");
      } else {
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const submitQuiz = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/training/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          description: description || undefined,
          departmentId: departmentId || undefined,
          categoryId: categoryId || undefined,
          questionCount,
          passThreshold,
          pickStrategy,
          status: "DRAFT"
        })
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Could not create quiz.");
      } else {
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const submitQuestion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/training/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          explanation: explanation || undefined,
          categoryId: questionCategoryId || undefined,
          departmentId: questionDepartmentId || undefined,
          safetyCritical,
          qualityCritical,
          options: options.filter((o) => o.label.trim().length > 0)
        })
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Could not add question.");
      } else {
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const submitShare = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/training/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: shareQuizId,
          label: shareLabel || undefined,
          expiresAt: shareExpiresAt ? new Date(shareExpiresAt).toISOString() : undefined
        })
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Could not create share link.");
      } else {
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad">
      <div className="tabs" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button type="button" className={`button ${tab === "quizzes" ? "primary" : ""}`} onClick={() => setTab("quizzes")}>
          Quizzes ({quizzes.length})
        </button>
        <button type="button" className={`button ${tab === "newQuiz" ? "primary" : ""}`} onClick={() => setTab("newQuiz")}>
          New quiz
        </button>
        <button type="button" className={`button ${tab === "newQuestion" ? "primary" : ""}`} onClick={() => setTab("newQuestion")}>
          New question ({bankSize})
        </button>
        <button type="button" className={`button ${tab === "share" ? "primary" : ""}`} onClick={() => setTab("share")}>
          Share links ({links.length})
        </button>
      </div>

      {error ? (
        <div className="callout red" style={{ marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {tab === "quizzes" ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Questions</th>
              <th>Pass %</th>
              <th>Share links</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((quiz) => {
              const quizLinks = linksByQuiz.get(quiz.id) ?? [];
              return (
                <tr key={quiz.id}>
                  <td>
                    <strong>{quiz.title}</strong>
                    <div className="metric-note">
                      <code>{quiz.slug}</code>
                    </div>
                  </td>
                  <td>{quiz.status}</td>
                  <td>{quiz.questionCount}</td>
                  <td>{quiz.passThreshold}%</td>
                  <td>{quizLinks.length}</td>
                  <td>
                    {quiz.status !== "PUBLISHED" ? (
                      <button type="button" className="button primary" disabled={busy} onClick={() => publish(quiz.id)}>
                        Publish
                      </button>
                    ) : (
                      <span className="metric-note">Published</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}

      {tab === "newQuiz" ? (
        <form onSubmit={submitQuiz}>
          <div className="grid two-col">
            <label>
              <strong>Slug</strong>
              <input type="text" value={slug} onChange={(event) => setSlug(event.target.value)} required maxLength={80} />
            </label>
            <label>
              <strong>Title</strong>
              <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} />
            </label>
            <label>
              <strong>Department</strong>
              <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                <option value="">(all departments)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label>
              <strong>Category</strong>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">(no category)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>
              <strong>Questions per attempt</strong>
              <input
                type="number"
                min={1}
                max={100}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
              />
            </label>
            <label>
              <strong>Pass threshold %</strong>
              <input
                type="number"
                min={40}
                max={100}
                value={passThreshold}
                onChange={(event) => setPassThreshold(Number(event.target.value))}
              />
            </label>
            <label>
              <strong>Pick strategy</strong>
              <select value={pickStrategy} onChange={(event) => setPickStrategy(event.target.value)}>
                <option value="random_balanced">Random balanced</option>
                <option value="random">Random</option>
                <option value="sequential">Sequential</option>
              </select>
            </label>
          </div>
          <label style={{ display: "block", marginTop: 12 }}>
            <strong>Description</strong>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </label>
          <button type="submit" className="button primary" disabled={busy} style={{ marginTop: 12 }}>
            {busy ? "Saving..." : "Save quiz"}
          </button>
        </form>
      ) : null}

      {tab === "newQuestion" ? (
        <form onSubmit={submitQuestion}>
          <label style={{ display: "block" }}>
            <strong>Prompt</strong>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              required
              minLength={5}
              maxLength={2000}
            />
          </label>
          <label style={{ display: "block", marginTop: 12 }}>
            <strong>Explanation</strong>
            <textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} rows={2} maxLength={2000} />
          </label>
          <div className="grid two-col" style={{ marginTop: 12 }}>
            <label>
              <strong>Department</strong>
              <select value={questionDepartmentId} onChange={(event) => setQuestionDepartmentId(event.target.value)}>
                <option value="">(all departments)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label>
              <strong>Category</strong>
              <select value={questionCategoryId} onChange={(event) => setQuestionCategoryId(event.target.value)}>
                <option value="">(none)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <label>
              <input type="checkbox" checked={safetyCritical} onChange={(event) => setSafetyCritical(event.target.checked)} />
              Safety-critical
            </label>
            <label>
              <input type="checkbox" checked={qualityCritical} onChange={(event) => setQualityCritical(event.target.checked)} />
              Quality-critical
            </label>
          </div>
          <h3>Options</h3>
          {options.map((option, index) => (
            <div key={index} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input
                type="text"
                value={option.label}
                onChange={(event) =>
                  setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, label: event.target.value } : o)))
                }
                placeholder={`Option ${index + 1}`}
                style={{ flex: 1 }}
              />
              <label>
                <input
                  type="checkbox"
                  checked={option.isCorrect}
                  onChange={(event) =>
                    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, isCorrect: event.target.checked } : o)))
                  }
                />
                Correct
              </label>
            </div>
          ))}
          <button type="submit" className="button primary" disabled={busy} style={{ marginTop: 12 }}>
            {busy ? "Saving..." : "Save question"}
          </button>
        </form>
      ) : null}

      {tab === "share" ? (
        <>
          <form onSubmit={submitShare} style={{ marginBottom: 16 }}>
            <div className="grid two-col">
              <label>
                <strong>Quiz</strong>
                <select value={shareQuizId} onChange={(event) => setShareQuizId(event.target.value)} required>
                  <option value="">Select a quiz</option>
                  {quizzes
                    .filter((q) => q.status === "PUBLISHED")
                    .map((q) => (
                      <option key={q.id} value={q.id}>{q.title}</option>
                    ))}
                </select>
              </label>
              <label>
                <strong>Label (optional)</strong>
                <input type="text" value={shareLabel} onChange={(event) => setShareLabel(event.target.value)} maxLength={160} />
              </label>
              <label>
                <strong>Expires</strong>
                <input
                  type="datetime-local"
                  value={shareExpiresAt}
                  onChange={(event) => setShareExpiresAt(event.target.value)}
                />
              </label>
            </div>
            <button type="submit" className="button primary" disabled={busy || !shareQuizId} style={{ marginTop: 12 }}>
              {busy ? "Creating..." : "Create share link"}
            </button>
          </form>
          <table className="data-table">
            <thead>
              <tr>
                <th>Link</th>
                <th>Quiz</th>
                <th>Label</th>
                <th>Uses</th>
                <th>Expires</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => {
                const quiz = quizzes.find((q) => q.id === link.quizId);
                const url = typeof window === "undefined" ? `/quiz/${link.token}` : `${window.location.origin}/quiz/${link.token}`;
                return (
                  <tr key={link.id}>
                    <td>
                      <code>{url}</code>
                    </td>
                    <td>{quiz?.title ?? link.quizId}</td>
                    <td>{link.label ?? "—"}</td>
                    <td>{link.usageCount}</td>
                    <td>{link.expiresAt ? new Date(link.expiresAt).toLocaleString() : "—"}</td>
                    <td>{link.active ? "Active" : "Disabled"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : null}
    </div>
  );
}
