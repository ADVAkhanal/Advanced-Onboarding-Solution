# Training & Assessments Module

**Status:** Production design + implementation reference.
**Origin:** Absorbed and modernized from `github.com/ADVAkhanal/SUPER-FORM-QUIZ` (the QuizHub Railway prototype).
**Owner module:** `src/app/(platform)/training/*`, `src/app/quiz/[token]/*`, `src/app/api/training/*`, `src/lib/training.ts`.

---

## 1 — What it does

Lets a manager build quizzes from a shared question bank, **publish** them, **share a link**, and have any employee complete the quiz **without logging in**. Every attempt is recorded in PostgreSQL (not browser local storage, unlike the QuizHub prototype). Manager insights and a CSV export are available immediately.

This module is for *operational training evidence* — safety briefings, quality refreshers, machine-handling reviews, SOP comprehension. It is not a regulatory record system. It does not stand in for any AS9100/ISO 9001 training matrix; it complements one.

---

## 2 — Roles

| Role | What they can do |
|---|---|
| **USER** | Take quizzes via share links. View their own training assignments (if assigned through `TrainingAssignment`). |
| **MANAGER** | Author quizzes & questions in their department scope. Publish quizzes. Create share links. View department records and insights. |
| **DIRECTOR** | Everything a manager can, across their granted departments. |
| **ADMIN** | All of the above plus org-wide records, cross-department quizzes, and admin of the question bank. |

Permissions: `quiz:take` (USER+), `quiz:launch` (MANAGER+), `quiz:author` (MANAGER+), `quiz:insights` (MANAGER+), `quiz:admin` (ADMIN).

---

## 3 — Surfaces

- `/training` — Manager launcher. KPIs, list of your quizzes, recent attempts.
- `/training/admin` — Authoring: quizzes, questions, share links.
- `/training/bank` — The question bank.
- `/training/records` — Searchable record of every attempt with status / score / cert. CSV export.
- `/training/insights` — 90-day pass-rate breakdowns by quiz and by department.
- `/quiz/[token]` — **Public**, no-login participant page. Renders the question form, scores on submit, issues a certificate number on pass.

---

## 4 — Data model

- `QuizDefinition` — slug, title, department, category, status (`DRAFT` / `PUBLISHED` / `ARCHIVED`), question count, pass threshold, time limit, pick strategy.
- `QuizQuestion` + `QuizQuestionOption` — the question bank; supports safety/quality-critical flags.
- `QuestionBankCategory` — taxonomy.
- `QuizShareLink` — token-based share with optional expiry and usage counter.
- `QuizAttempt` — participant (name + optional employee ID + department + manager), status, score, certificate, started/completed timestamps, IP & UA.
- `QuizAttemptAnswer` — per-question answer, scored boolean, links back to the selected option.

Every table carries `organizationId`, `createdAt`, `updatedAt`, `archivedAt`, `createdById`, `updatedById`, `departmentId`, `ownerId` per the project schema convention.

---

## 5 — Public share-link flow

1. Manager creates a `QuizShareLink`. Token is 10 chars from a confusables-free alphabet.
2. Manager copies `${origin}/quiz/${token}` and sends it via Slack/text/email.
3. Participant opens the URL. Middleware allows `/quiz/*` and `/api/training/attempts` without an auth cookie.
4. Participant fills name (+ optional employee ID / dept / manager) and starts.
5. Server selects N questions per `pickStrategy` (random, random_balanced, or sequential), creates a `QuizAttempt` row, returns the question payload.
6. Participant submits answers. Server scores, computes percent, marks `PASSED` / `FAILED`, generates a `certificateNumber` on pass, writes `AuditLog` entry.

Share-link links are stamped with their share-link id on the attempt for tracing.

---

## 6 — What we kept vs. dropped from QuizHub

| QuizHub feature | Status here |
|---|---|
| One link any manager can toss around | **Kept**. Share-link tokens, no-login participant page. |
| Department search chips | **Kept** via the question-bank `departmentId` and the launcher's department filter. |
| Length selector (Auto / 5 / 10 / 15 / All) | **Kept** as `QuizDefinition.questionCount` with `pickStrategy`. |
| Status filter (All / Pass / Fail) | **Kept** in `/training/records`. |
| CSV / JSON export | CSV kept at `/api/training/records.csv`. JSON: use the Records API. |
| Local browser history | **Dropped intentionally.** Records now live in PostgreSQL — the requirement is durable, manager-visible evidence, not per-browser convenience. |
| Pass-rate roll-up dashboard | **Kept and expanded** to per-quiz and per-department breakdowns. |
| Completion certificate | **Kept**. Certificate number issued on pass; can be printed via browser print. |

---

## 7 — Non-goals

- This module is **not** a regulatory training matrix system. It records evidence; it does not assert compliance.
- It does **not** sync with any external LMS unless an integration is built and approved.
- It does **not** collect SSN, banking, medical, or background-check information. Participant fields are deliberately limited to name, employee ID, department, manager.
