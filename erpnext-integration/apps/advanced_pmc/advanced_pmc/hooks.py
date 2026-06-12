app_name = "advanced_pmc"
app_title = "Advanced PMC"
app_publisher = "Advanced PMC"
app_description = "Advanced PMC customizations on top of ERPNext: custom doctypes, fixtures, and the read-only integration API consumed by the Shop-Management Next.js frontend."
app_email = "it@advcosinc.com"
app_license = "mit"

# Export Custom Fields / Property Setters here so config is versioned with the
# app instead of living only in the database:
#
# fixtures = [
#     {"dt": "Custom Field", "filters": [["module", "=", "Advanced PMC"]]},
#     {"dt": "Property Setter", "filters": [["module", "=", "Advanced PMC"]]},
# ]

# New doctypes created with `bench new-doctype` (app: advanced_pmc) land under
# advanced_pmc/advanced_pmc/doctype/ and are picked up automatically.

# Keep core untouched — all customization lives in this app so `bench update`
# stays a clean version bump (see ../../docs/erpnext-integration.md).
