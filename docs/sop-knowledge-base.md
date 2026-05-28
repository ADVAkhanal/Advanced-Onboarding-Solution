# SOP Knowledge Base Assistant

**Status:** Production design + implementation reference.
**Owner module:** `src/lib/ai/sop-*`, `src/app/(platform)/sop/*`, `src/app/api/sop/*`.
**LLM:** Anthropic Claude via `@anthropic-ai/sdk` behind a provider abstraction.
**Company context:** Advanced Consulting Inc. — precision machining (aerospace / defense / oil & gas / food). ISO 9001 + AS9100 environment. CMM-based inspection.

---

## 1 — Mission (single sentence)

> Answer employee questions **only** from approved internal SOPs, **always cite** the source, and **escalate to a human manager** whenever the question is unsupported, weak, conflicting, safety-critical, quality-critical, or customer-impacting.

The assistant is not a general-purpose chatbot. It is a controlled, auditable lookup over the approved internal procedure library.

---

## 2 — Hard rules

1. **Grounded answers only.** No answer is produced unless the retriever returns approved-document chunks that materially support it.
2. **Citations are mandatory.** Every fact in an answer must be tagged to a chunk ID; the UI renders chips that link back to the source document and section.
3. **Refusal is the default failure mode.** Low confidence, no support, or conflicting sources → no answer is shown. The user sees an escalation notice instead.
4. **Escalate, don't guess.** Six triggers (defined below) route the question to the user's manager (fallback director, then admin) as a `SopEscalation` record.
5. **Approved versions only.** Drafts and superseded versions are never retrievable, even by admins, from the ask endpoint. They are visible only in the admin authoring UI.
6. **Permission-aware retrieval.** A user cannot retrieve from documents they couldn't otherwise read (scope by department / visibility level / role).
7. **Out-of-scope redaction.** Any payload sent to the AI provider passes through `redactProhibited` first. CUI / PCI / PHI / banking / credentials / secrets are stripped before transmission. (See [`data-boundaries.md`](./data-boundaries.md).)
8. **Audit everything.** Each call writes an `AIActionLog` entry with: prompt class, user, scope, provider, model, redaction summary, citation count, confidence band, escalation outcome.
9. **No raw prompt content** is stored in `AIActionLog` unless the org has set `ai.storeRawPrompts = true` (off by default).
10. **Human-in-the-loop for workflow changes.** The assistant can *suggest* SOP edits via escalation, but never applies them.

---

## 3 — Six escalation triggers

The assistant must classify each question and trigger escalation if **any** apply:

| Trigger | Definition | Examples |
|---|---|---|
| **Unsupported** | Retrieval returned no chunks above the relevance floor. | "What's our policy on remote work in the casting department?" when no SOP covers it. |
| **Weak** | Top chunks are below the confidence floor (model self-reports `confidence < 0.7`). | Question paraphrases an SOP but the SOP only covers a related case. |
| **Conflicting** | Two or more retrieved chunks give different answers, or the model's draft answer contradicts a retrieved chunk. | SOP-12 says "stop the line"; SOP-44 says "page the lead first." |
| **Safety-critical** | The question touches PPE, lockout/tagout, machine guarding, chemical handling, emergency response, evacuation, ergonomic injury risk, electrical, pressurized systems, hot work, confined space. | "Can I bypass the door interlock to clear a chip jam?" |
| **Quality-critical** | The question touches FAI, first-piece inspection, CMM verification, nonconformance disposition, customer-specific quality requirements, AS9100 records, calibration, traceability. | "Can I ship without the FAI signed off?" |
| **Customer-impacting** | The question affects an order, ship date, customer-specific spec, customer-controlled drawing/process, RMA, customer audit response. | "Customer X wants us to skip the heat treat — can we?" |

A classifier prompt (separate from the answer prompt, run in the same Claude tool-use call) returns a JSON object with one boolean per trigger. The route uses these to set `requiresEscalation = true` if any are `true`.

---

## 4 — Document lifecycle

```
DRAFT  →  IN_REVIEW  →  APPROVED  →  SUPERSEDED  →  ARCHIVED
                ↘  REJECTED
```

- **DRAFT**: created by Manager+ via `sop:author`. Not retrievable.
- **IN_REVIEW**: submitted for approval. Not retrievable.
- **APPROVED**: approver (`sop:approve`, ADMIN by default; DIRECTOR within their scope) signs off. Becomes the active version for its `documentKey`. Retrievable.
- **SUPERSEDED**: a newer APPROVED version exists. Not retrievable, kept for history.
- **REJECTED**: rejected with reason. Not retrievable.
- **ARCHIVED**: explicitly archived (soft delete). Not retrievable.

Each `SopDocument` has many `SopDocumentVersion`s. Each version has many `SopChunk`s (the retrievable units). Approval is recorded on the *version* in `SopApproval`.

A document carries:
- `documentKey` (stable key across versions, e.g. `qa/fai-process`)
- `title`, `category`, `departmentId?`, `visibility`
- `safetyCritical`, `qualityCritical`, `customerImpacting` flags (boost the escalation classifier when retrieved chunks come from a flagged doc)
- Lifecycle metadata, owner, last-approved-by, last-approved-at

---

## 5 — Retrieval

**Storage:** all chunks live in `sop_chunks` with `content`, `tokenCount`, `headingPath` (e.g. `"Section 3 > 3.2 First-Piece Process"`), and an optional `embedding JSON` column for future vector search.

**Phase 1 retrieval (now): lexical.** Postgres full-text search using `to_tsvector('english', content)` with a GIN index. Query path:
1. Normalize query.
2. `websearch_to_tsquery('english', $1)` against approved chunks scoped to the user's permissions.
3. Rank by `ts_rank_cd` + recency boost.
4. Return top-K (default 6) chunks, each with `documentId`, `documentTitle`, `chunkId`, `headingPath`, `content`, `score`.
5. If top score < `RELEVANCE_FLOOR` (default 0.05) → return empty.

**Phase 2 (future):** hybrid lexical + embeddings. Schema supports it; switch is a feature flag.

**Permission filter:**
```
where:
  organizationId = user.organizationId
  approvalStatus = 'APPROVED'
  archivedAt is null
  AND (visibility = 'ALL_USERS'
       OR (visibility = 'DEPARTMENT' AND departmentId in user.allowedDepartmentIds)
       OR (visibility = 'MANAGER_PLUS' AND user.userLevel != 'USER')
       OR (visibility = 'DIRECTOR_PLUS' AND user.userLevel in ('DIRECTOR','ADMIN'))
       OR (visibility = 'ADMIN_ONLY' AND user.userLevel = 'ADMIN'))
```

---

## 6 — Claude call (answerer + classifier in one round)

The answerer is a single Claude call using **tool use** to force a structured response. The tool schema:

```json
{
  "name": "respond",
  "input_schema": {
    "type": "object",
    "required": ["answer_or_null", "citations", "confidence", "triggers"],
    "properties": {
      "answer_or_null": {
        "type": ["string", "null"],
        "description": "Answer in plain English, 1-4 short paragraphs. NULL if you cannot answer from the provided chunks."
      },
      "citations": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["chunk_id", "supports"],
          "properties": {
            "chunk_id": { "type": "string" },
            "supports": { "type": "string", "description": "Which sentence(s) of the answer this chunk supports." }
          }
        }
      },
      "confidence": {
        "type": "number",
        "minimum": 0,
        "maximum": 1,
        "description": "Your self-rated confidence that the answer is fully supported."
      },
      "triggers": {
        "type": "object",
        "required": ["unsupported", "weak", "conflicting", "safety_critical", "quality_critical", "customer_impacting"],
        "properties": {
          "unsupported": { "type": "boolean" },
          "weak": { "type": "boolean" },
          "conflicting": { "type": "boolean" },
          "safety_critical": { "type": "boolean" },
          "quality_critical": { "type": "boolean" },
          "customer_impacting": { "type": "boolean" }
        }
      },
      "escalation_summary": {
        "type": ["string", "null"],
        "description": "If any trigger is true, a one-paragraph summary the receiving manager should see."
      }
    }
  }
}
```

The system prompt enforces:
- Answer **only** from provided chunks; otherwise return `null`.
- Cite every claim by `chunk_id`.
- Mark `unsupported = true` if no chunk materially supports the answer.
- Mark `weak = true` if support is partial or inferential.
- Mark `conflicting = true` if chunks disagree.
- Mark the topical triggers based on the question and chunk content.
- `confidence` is the model's self-estimate; the route ignores the model's `answer_or_null` if `confidence < 0.7`.

**Caching:** the system prompt + tool schema are cached via `cache_control` to amortize per-call tokens.

**Model:** default `claude-sonnet-4-6`. Configurable per-org via `Setting.key = "ai.sop.model"`. Speed-sensitive orgs can switch to `claude-haiku-4-5-20251001`.

**Refusal logic (server side, after Claude returns):**
```
if any trigger is true OR confidence < 0.7 OR answer_or_null is null:
    requiresEscalation = true
    answerShown = null
else:
    answerShown = answer_or_null
```

This way the model can't accidentally smuggle an answer past the gate.

---

## 7 — Escalation

When `requiresEscalation = true`:

1. Create a `SopEscalation` row:
   - `organizationId`, `queryId`, `userId`, `departmentId`
   - `routedToUserId` = user's manager (fallback director, then any ADMIN)
   - `reasonSummary` (model's `escalation_summary`)
   - `triggers` (JSON of which booleans fired)
   - `status = 'OPEN'`
2. Write an `AIActionLog` entry with outcome `ESCALATED`.
3. Optionally fire a Pushover notification to the routed manager (reusing `sendPushoverAlert`).
4. The UI shows the user: *"This question needs a human review. Your manager has been notified and will follow up."*

Manager inbox: `/sop/escalations` lists OPEN escalations they own, with the original question, the redacted retrieval result, and actions: **Answer**, **Author SOP draft**, **Reassign**, **Close (no action)**. Closing requires a reason.

---

## 8 — Audit

`AIActionLog` records:
- `action` (e.g. `sop.ask`, `sop.escalate`, `sop.answer`)
- `actorId`, `departmentId`
- `provider` ("anthropic"), `model` (e.g. `claude-sonnet-4-6`)
- `promptClass` ("sop_ask")
- `inputTokens`, `outputTokens`, `cacheReadTokens`
- `redactionApplied` (which classes were stripped)
- `citationCount`, `confidence`, `outcome` (`ANSWERED` / `REFUSED` / `ESCALATED`)
- `requestId` (correlates with `SopQuery.id`)

Raw prompt content is **not** stored unless `ai.storeRawPrompts = true`. The default deliberately keeps the audit log free of customer-sensitive query content.

---

## 9 — Permission catalog (new)

| Key | USER | MANAGER | DIRECTOR | ADMIN | Purpose |
|---|---|---|---|---|---|
| `sop:ask` | ✓ | ✓ | ✓ | ✓ | Ask the SOP assistant a question. |
| `sop:author` |  | ✓ | ✓ | ✓ | Create a draft SOP version. |
| `sop:approve` |  |  | ✓ (scope) | ✓ | Approve a SOP version. DIRECTOR limited to their dept scope. |
| `sop:admin` |  |  |  | ✓ | Manage doc lifecycle / supersede / archive. |
| `sop:escalation:resolve` |  | ✓ | ✓ | ✓ | Close escalations routed to them. |
| `ai:use` | ✓ | ✓ | ✓ | ✓ | Master gate for AI features; admin can disable per org. |
| `ai:audit` |  |  | ✓ (scope) | ✓ | View `AIActionLog`. |

---

## 10 — Failure modes & their handling

| Failure | Handling |
|---|---|
| Anthropic API unreachable / 5xx | Return refusal to user, write `AIActionLog` outcome `PROVIDER_ERROR`, no escalation created (transient). |
| Anthropic API hard error (401, schema) | Same as above + alert ADMIN via notification. |
| `ANTHROPIC_API_KEY` missing | `/api/sop/ask` returns 503 with explanatory message; admin sees a banner on `/sop/admin`. |
| Retriever empty | Skip the model call; immediately escalate with trigger = `unsupported`. |
| All chunks for the user are in restricted-visibility docs they can't read | Behaves identically to empty retrieval (`unsupported`). Does not leak the existence of restricted docs. |
| Rate limit (per user) | 30 questions/hour for USER, 100/hour for MANAGER+. Returns 429. |
| Pathologically long question (> 4000 chars) | Reject before calling Claude. |

---

## 11 — UI surfaces

- `/sop` — Ask box (large text area, Submit). Below the box: streaming answer with citation chips, or escalation notice. History panel of the user's recent questions and outcomes.
- `/sop/admin` — Document library (Approved / Drafts / Superseded / Archived tabs). Upload (paste text or markdown), edit, submit for approval, approve, supersede, archive. Each doc shows its chunks and how many times each was cited last 30 days.
- `/sop/escalations` — Manager inbox. Open / Mine / All-in-dept / Closed tabs. Click an escalation to see the original question, retrieved chunks (read-only), and resolution actions.
- `/sop/audit` (admin) — `AIActionLog` filtered view.

---

## 12 — Non-goals

- The assistant does **not** answer questions about CUI/ITAR-controlled drawings, customer-specific technical data, banking, payroll credentials, medical, or any other out-of-scope content. The redaction layer blocks the data from reaching the model in the first place.
- The assistant does **not** apply changes. It only suggests via escalation.
- The assistant does **not** browse the web, run code, or call external systems.
- It is **not** trained on company data. All grounding is via retrieval at request time from approved versions only.
