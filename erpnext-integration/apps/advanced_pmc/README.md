# advanced_pmc — custom Frappe app

Advanced PMC's customizations **on top of** ERPNext. This is the supported seam:
core ERPNext stays untouched and pinned, all org-specific behavior lives here,
so `bench update` remains a version bump rather than a merge.

```
advanced_pmc/
  pyproject.toml                 # app metadata (flit)
  advanced_pmc/
    __init__.py                  # __version__
    hooks.py                     # app registration + fixtures hook
    api.py                       # whitelisted read-only integration endpoints
    doctype/                     # (custom doctypes go here via `bench new-doctype`)
    fixtures/                    # (Custom Fields / Property Setters exported here)
```

Install (from the bench, see ../../README.md):

```bash
bench get-app advanced_pmc /workspace/development/advanced_pmc
bench --site <site> install-app advanced_pmc
```

Integration endpoint example (read-only, counts only):
`GET /api/method/advanced_pmc.api.shop_health` →
`{ "open_work_orders": n, "submitted_boms": n, "active_items": n, ... }`

**Never** add accounting, payroll, banking, or PII to the bridge surface — the
Shop-Management client (`src/lib/erpnext/client.ts`) also enforces an operational
doctype allowlist.
