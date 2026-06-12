# erpnext-integration

The Frappe/ERPNext side of the Advanced PMC integration. **This folder does not
contain ERPNext** — ERPNext lives in the pinned GitHub fork `ADVAkhanal/erpnext`
and is pulled as a Docker image. This folder holds:

- `docker-compose.yml` — a pinned, reproducible ERPNext stack (adapted from
  [`frappe/frappe_docker`](https://github.com/frappe/frappe_docker) `pwd.yml`).
- `.env.example` — version + secrets.
- `apps/advanced_pmc/` — the **custom Frappe app** where Advanced's
  customizations live (the supported way to extend ERPNext without forking core).

See `../docs/erpnext-integration.md` for the architecture and the "why".

> ERPNext requires Linux + MariaDB + Redis; run this on a Linux host, a VM, or
> Railway — not the Windows dev box.

## Quick start

```bash
# 0. Fork once (GitHub UI, or gh):
gh repo fork frappe/erpnext --org ADVAkhanal --clone=false

# 1. Configure + boot a pinned ERPNext:
cp .env.example .env          # set ERPNEXT_VERSION, SITE_NAME, passwords
docker compose up -d          # db + redis + workers + erpnext + auto site-create

# 2. Install the custom app on top:
docker compose exec backend bench get-app advanced_pmc /workspace/development/advanced_pmc
docker compose exec backend bench --site "$SITE_NAME" install-app advanced_pmc

# 3. Create an integration API key/secret (least-privilege user) in ERPNext,
#    then set ERPNEXT_BASE_URL / ERPNEXT_API_KEY / ERPNEXT_API_SECRET in the
#    Shop-Management (Next.js) environment.
```

## Upgrading ERPNext

Bump `ERPNEXT_VERSION` in `.env`, `docker compose pull && docker compose up -d`,
then `bench --site <site> migrate`. Because we never patched core, this is a
version bump — not a merge.

## Where customizations go

- **Custom Fields / Property Setters** → export as fixtures from `advanced_pmc`
  (`bench --site <site> export-fixtures`), commit them under
  `apps/advanced_pmc/advanced_pmc/fixtures/`.
- **New doctypes** → `bench --site <site> new-doctype` with the `advanced_pmc`
  app selected; they land under `advanced_pmc/advanced_pmc/doctype/`.
- **Server logic / integration endpoints** → `advanced_pmc/api.py` (whitelisted,
  read-only for the bridge).
