# AI Integration Policy

**Status:** Load-bearing. Every AI-touching code path in this app must satisfy these rules.
**Provider today:** Anthropic Claude via `@anthropic-ai/sdk`, behind the `AIProvider` interface in `src/lib/ai/provider.ts`.

---

## 1 — Mission

AI features in Advanced Shop Management & Onboarding Command Center are **controlled, auditable, and grounded**. They are not chat with the model. They are narrow tools that:

1. Answer from approved internal documents only (SOP Knowledge Base).
2. Summarize the user's *own* permitted records (manager digests, ticket summaries).
3. Suggest workflow changes that always require human approval.

The platform does not let the model browse the web, run code, or call external systems on its own.

---

## 2 — Hard rules (all features must satisfy)

| Rule | Enforcement |
|---|---|
| Redact before sending | `redactProhibited()` strips SSNs, banking numbers, cards, API keys, secrets, emails, phones before any payload leaves the system. |
| Permission-aware retrieval | Retrieval and summarization scope to the calling user's `permissions`, `departmentId`, `departmentAccessIds`. The model can never surface what the user couldn't see directly. |
| Approved-source-only | The SOP assistant retrieves only `APPROVED` document versions. Drafts/superseded versions are invisible to retrieval. |
| Mandatory citations | Grounded answers cite by chunk ID. The UI renders citation chips. |
| Refusal as default | Low confidence (< 0.7), no support, or null answer → no answer is shown. |
| Escalation triggers | Six triggers (unsupported / weak / conflicting / safety / quality / customer-impact) route to a human manager. |
| Audit every call | `AIActionLog` records provider, model, prompt class, tokens, redaction summary, citation count, confidence, outcome. |
| Raw prompts off by default | `AIActionLog` does NOT store raw prompt content unless `Setting.ai.storeRawPrompts = true`. |
| Human-in-the-loop for changes | The model can propose; only humans can apply. |
| Org-level kill switch | An admin can set `Setting.ai.enabled = false` and disable every AI feature without redeploying. |

---

## 3 — Provider abstraction

`AIProvider` (in `src/lib/ai/provider.ts`) is the only surface other code calls. Today's implementation is `AnthropicProvider`. Swapping providers is a single class implementation + env var change.

`callStructured()` enforces tool-use so the model always returns a JSON object matching a declared `input_schema`. Free-text answers are forbidden at the API boundary.

System prompts are cached via `cache_control: { type: "ephemeral" }` to amortize tokens.

---

## 4 — Models

Default: `claude-sonnet-4-6`. Per-feature overrides via env (`ANTHROPIC_MODEL`) or per-org `Setting.ai.sop.model`. Speed-sensitive features can use `claude-haiku-4-5-20251001`. Quality-sensitive paths (escalation classifiers, FAI-related answers) should not drop below Sonnet.

---

## 5 — Auditing

`AIActionLog` is append-only from the application. Admins can view it through `ai:audit`. UI never offers a delete. Soft-delete via `archivedAt` is reserved for retention policy, not user-driven removal.

Each entry includes:

- `action` (`sop.ask`, `sop.escalate`, `sop.answer`, future: `digest.manager_weekly`, `summary.ticket`, etc.)
- `provider`, `model`, `promptClass`
- `inputTokens`, `outputTokens`, `cacheReadTokens`
- `redactionApplied` (which classes fired and counts)
- `citationCount`, `confidence`
- `outcome` (`ANSWERED` / `REFUSED` / `ESCALATED` / `PROVIDER_ERROR` / `REJECTED_BY_FILTER`)
- `requestId` for correlation with the originating record (e.g. `SopQuery.id`)

---

## 6 — Failure handling

- API unreachable → return refusal, log `PROVIDER_ERROR`. No escalation row (transient).
- API hard error → log + alert admin via notification.
- Missing `ANTHROPIC_API_KEY` → endpoints return 503; admin sees a banner on `/sop/admin`.
- Retrieval empty → skip the model; escalate with `unsupported = true`.
- Rate limit per user (planned): 30/hour USER, 100/hour MANAGER+.

---

## 7 — Out of scope (today and on purpose)

- Model-driven actions on user records (no auto-close, no auto-assign).
- Model-driven changes to RBAC, departments, settings, or integrations.
- Model access to CUI/ITAR-controlled drawings, customer specs, banking, medical, PII outside what the user already sees.
- Training the model on this org's data.
