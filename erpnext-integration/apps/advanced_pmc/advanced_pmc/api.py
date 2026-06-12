"""Read-only integration endpoints consumed by the Shop-Management bridge.

Whitelisted so the Next.js app can call them at
`/api/method/advanced_pmc.api.<fn>` with API key/secret auth. Return aggregate
counts only — never documents, PII, or financial data. The operational
data-scope boundary is enforced on the consumer side too
(see ../../../src/lib/erpnext/client.ts ALLOWED_DOCTYPES).
"""

import frappe


@frappe.whitelist()
def shop_health():
    """Operational snapshot for the Shop-Management dashboards. Counts only."""
    open_states = ["Completed", "Stopped", "Closed", "Cancelled"]
    return {
        "open_work_orders": frappe.db.count("Work Order", {"status": ["not in", open_states]}),
        "submitted_boms": frappe.db.count("BOM", {"docstatus": 1, "is_active": 1}),
        "active_items": frappe.db.count("Item", {"disabled": 0}),
        "open_quality_inspections": frappe.db.count("Quality Inspection", {"docstatus": 0}),
    }
