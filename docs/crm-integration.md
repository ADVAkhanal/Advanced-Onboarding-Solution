# CRM & Proposal Integration (Twenty CRM + Papermark)

The CRM Portal (`/crm`) captures customer and proposal requests, pushes them to
[Twenty CRM](https://twenty.com), shares proposal PDFs through
[Papermark](https://papermark.io), and feeds view/download analytics back into
the local record. It follows the standard integration-bridge contract
([ADR 0001](adr/0001-integration-bridge-pattern.md)): env-gated, health-probed,
least-privilege, audit-logged.

## Data flow

```
Capture form (/crm)                 POST /api/integrations/crm/request
  │  local CrmRequest created FIRST (status NEW) — always authoritative
  ▼
Twenty CRM (best-effort)            createPerson + createOpportunity
  │  success → status SENT_TO_CRM, twentyPersonId/twentyOpportunityId stored
  │  failure → CRM-502 logged, syncError set, local record kept
  ▼
Share proposal (/crm row action)    POST /api/integrations/crm/{id}/proposal
  │  Papermark createDocument + createLink → status PROPOSAL_SHARED
  │  papermarkDocumentId / papermarkLinkId / proposalUrl stored
  ▼
Refresh analytics (/crm row action) PATCH /api/integrations/crm/{id}/proposal
     getLinkAnalytics → proposalViews / proposalDownloads / lastViewedAt
```

The **CRM Activity** dashboard (`/erp/dashboards/crm-activity`, permission
`crm:view`) reads the local `CrmRequest` table only — requests by status/type,
CRM sync state, and Papermark proposal engagement. No customer PII beyond
operational contact metadata is surfaced, keeping it inside the data-scope
boundary even when both integrations are connected.

## Resilience

The local `CrmRequest` is the authoritative record. Twenty and Papermark are
best-effort: a CRM or Papermark outage logs an error code (`CRM-502` /
`DOC-502`) and sets `syncError`, but never loses the capture. Unconfigured
integrations short-circuit with `CRM-503` / `DOC-503` so the UI can show "not
configured" rather than failing.

## Permissions

| Permission   | Who              | Grants                                        |
|--------------|------------------|-----------------------------------------------|
| `crm:view`   | Manager+         | View the portal and the CRM Activity dashboard |
| `crm:manage` | Manager+         | Capture requests, share proposals, refresh analytics |

## Environment variables

All optional — leave unset to run fully local (captures still work; sync/share
controls show "not configured"). Never commit secrets; set these on Railway.

| Variable            | Purpose                                  | Default                     |
|---------------------|------------------------------------------|-----------------------------|
| `TWENTY_API_URL`    | Twenty CRM REST base URL                 | _(unset → CRM off)_         |
| `TWENTY_API_KEY`    | Twenty CRM API key (Bearer)              | _(unset → CRM off)_         |
| `PAPERMARK_API_KEY` | Papermark API key (Bearer)              | _(unset → Papermark off)_   |
| `PAPERMARK_API_URL` | Papermark API base URL                   | `https://app.papermark.io`  |
| `CRM_URL`           | "Open CRM" link target (sidebar/portal)  | `https://crm.yourdomain.com`|

Configuration status is reported at `GET /health`
(`integrations.twentyCrmConfigured`, `integrations.papermarkConfigured`) and on
the CRM Portal banner.

## Error codes

| Code      | Meaning                                            |
|-----------|----------------------------------------------------|
| `CRM-503` | Twenty CRM not configured                          |
| `CRM-502` | Twenty CRM request failed (timeout / upstream)     |
| `DOC-503` | Papermark not configured                           |
| `DOC-502` | Papermark request failed, or no link shared yet    |
| `REQ-404` | CRM request not found / not in caller's org        |

See [error-codes.md](error-codes.md) for the full catalog.
