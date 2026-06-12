import type { Phase } from "./types";

/**
 * The six-phase delivery roadmap. Each phase is sequenced so a single IT
 * administrator can run it: configuration before customization, customization
 * in the upgrade-safe advanced_pmc app or the Shop-Management layer, and core
 * ERPNext never patched.
 *
 * Several "future" capabilities already exist in the Shop-Management layer
 * (dashboards, SOP AI, Maintenance CMMS, First-Piece tracker, capacity
 * heatmap) — phases note where the platform is ahead of the plan.
 */
export const PHASES: Phase[] = [
  {
    number: 1,
    title: "Foundation ERP",
    tagline: "One source of truth — masters, buy/sell cycle, live inventory",
    businessValue:
      "Replaces spreadsheets and tribal knowledge with a single system of record: items, BOMs, customers, suppliers, the full quote→order→ship cycle, and real-time inventory with barcode transactions. Every later phase reads from this foundation, so its accuracy compounds.",
    features: [
      "Item master with UOM conversions, item groups, customer/supplier groups",
      "Multi-level BOM with routing and workstations",
      "Customer & supplier masters; CRM lead → opportunity → quotation",
      "Sales orders, delivery notes, shipments; purchase orders and receipts",
      "Warehouse/bin tree, serialized + lot inventory, barcode stock entries",
      "Reorder-level driven material requests (automated replenishment)",
      "Naming series + per-module settings configured, not coded"
    ],
    dependencies: ["ERPNext stood up from the pinned fork (erpnext-integration/)", "Master data cleansing (items, customers, suppliers, opening stock)"],
    effort: "4–8 weeks, configuration-heavy; the long pole is master-data cleanup, not software",
    upgradeImpact: "Low",
    technicalRisk: "Low",
    maintenanceBurden: "Low",
    roi: "Immediate: eliminates duplicate entry across spreadsheets, gives the first trustworthy inventory valuation and open-order picture. Typically pays back within the first missed-shortage it prevents.",
    implementationOrder: [
      "Company, warehouses, UOMs, naming series",
      "Item master + item groups (with barcodes)",
      "Customers/suppliers + price lists",
      "Buy cycle (PO → receipt → invoice match)",
      "Sell cycle (quotation → SO → delivery)",
      "Opening stock + reorder levels"
    ]
  },
  {
    number: 2,
    title: "Manufacturing Execution System",
    tagline: "The shop floor goes digital — travelers, job cards, live status",
    businessValue:
      "Turns work orders into live shop-floor objects: electronic travelers, barcode start/stop on operations, operator job-card terminals, downtime capture, and real-time WIP visibility. This is where the 'designed for machinists, not accountants' philosophy lands — large-target touchscreen flows, one scan to clock onto a job.",
    features: [
      "Work orders from BOMs; job cards per operation as the operator terminal",
      "Electronic traveler / digital job packet (print formats + portal view)",
      "Barcode-first start/stop/complete on operations",
      "Downtime entries with reasons; machine status board",
      "Labor tracking from job-card time logs (job costing feed)",
      "Operator dashboard (Shop-Management layer — touchscreen, mobile-first)",
      "Already live in the layer: shift handoff log with machine-down sync, maintenance board"
    ],
    dependencies: ["Phase 1 BOMs + routings", "Workstations mapped to the real machine roster", "Shop-floor hardware (tablets/scanners)"],
    effort: "6–10 weeks; config + print formats + the operator UX in the Shop-Management layer",
    upgradeImpact: "Low",
    technicalRisk: "Medium",
    maintenanceBurden: "Medium",
    roi: "Real labor + WIP numbers for the first time; quoting feedback loop (estimated vs actual hours) starts compounding — the same loop Shop-Management's cycle-time engine already runs.",
    implementationOrder: [
      "Workstations + operations + routings",
      "Job card flow piloted on 2–3 machines",
      "Electronic traveler print format",
      "Barcode start/stop rollout",
      "Downtime + machine status board",
      "Operator dashboard hardening"
    ]
  },
  {
    number: 3,
    title: "Quality & Traceability",
    tagline: "AS9100-grade evidence without the paper",
    businessValue:
      "Inspection plans, FAI/in-process/final inspections, NCR → CAPA flow, calibration/gauge control, and full material genealogy (lot/serial → supplier → operator → inspection). For an aerospace shop this is the audit-readiness phase: evidence is produced as a by-product of doing the work.",
    features: [
      "Quality Inspection templates per item/operation (incoming, in-process, final)",
      "FAI package print formats (AS9102-style forms from inspection data)",
      "Non Conformance → Quality Action (CAPA) workflow with approvals",
      "Gauge & calibration registry (custom doctypes, schedule-driven)",
      "Lot/serial genealogy reports — material, operator, inspection history",
      "Supplier traceability on receipts; certs attached at receiving",
      "Already live in the layer: First-Piece run tracker with NC defect codes + FPY"
    ],
    dependencies: ["Phase 2 job cards (inspection points hang off operations)", "Lot/serial discipline from Phase 1"],
    effort: "6–8 weeks; mostly templates + two custom doctypes (Gauge, Calibration) in advanced_pmc",
    upgradeImpact: "Low",
    technicalRisk: "Medium",
    maintenanceBurden: "Medium",
    roi: "Audit prep collapses from weeks to hours; scrap/rework drops because NCRs get root-caused instead of buried. Customer audits become a query, not a scramble.",
    implementationOrder: [
      "Inspection templates on top-running parts",
      "Receiving inspection + supplier certs",
      "NCR → CAPA workflow",
      "Gauge/calibration registry",
      "Genealogy reports",
      "FAI print package"
    ]
  },
  {
    number: 4,
    title: "Advanced Planning & Scheduling",
    tagline: "Finite capacity, honest promise dates, what-if",
    businessValue:
      "Moves planning from whiteboard to system: finite-capacity views by work center, constraint visibility, what-if simulation, and demand-driven production plans. This is ERPNext's weakest native area — the plan is deliberately staged last among core ops and leans on the custom layer where it's strongest.",
    features: [
      "Production plans from open sales orders + forecasts",
      "Capacity-vs-load by work center and month (already live: capacity heatmap dashboard)",
      "Finite scheduling board in the Shop-Management layer (drag jobs across centers)",
      "What-if simulation: trial schedules scored on lateness/utilization before commit",
      "Constraint flags: material not allocated, tooling busy, operator coverage",
      "Promise-date engine fed by the cycle-time feedback loop"
    ],
    dependencies: ["Phases 1–2 (accurate routings + actual cycle times)", "Work-center capacity table maintained"],
    effort: "8–12 weeks; the scheduler is the largest custom-app build in the roadmap",
    upgradeImpact: "Medium",
    technicalRisk: "High",
    maintenanceBurden: "Medium",
    roi: "On-time delivery becomes a managed number instead of an outcome; overtime drops because overloads are visible months out (the heatmap already exposes them today).",
    implementationOrder: [
      "Capacity data hygiene (hours/week per center)",
      "Production plan adoption",
      "Scheduling board (read-only first)",
      "Drag/commit scheduling",
      "What-if simulation",
      "Promise-date engine"
    ]
  },
  {
    number: 5,
    title: "Customer & Supplier Portals",
    tagline: "Self-service status — fewer calls, faster RFQs",
    businessValue:
      "Customers see order status, shipments, and documents without calling; suppliers quote RFQs and confirm POs in a portal instead of email ping-pong. ERPNext ships both portals natively — this phase is mostly configuration plus branding.",
    features: [
      "Customer portal: open orders, shipments, invoices, quality certs",
      "Supplier RFQ portal: suppliers submit quotes directly (native)",
      "PO acknowledgment + promised-date confirmation by suppliers",
      "Branded portal theme matching the Advanced identity",
      "Notification engine: status-change emails/alerts (native Notifications)"
    ],
    dependencies: ["Phase 1 (clean orders)", "Phase 3 helps (certs to publish)"],
    effort: "2–4 weeks, configuration + theming",
    upgradeImpact: "Low",
    technicalRisk: "Low",
    maintenanceBurden: "Low",
    roi: "Front-office hours back every week; supplier quote turnaround measurably faster. Highest ROI-per-effort phase in the roadmap.",
    implementationOrder: [
      "Customer portal pilot with 2 friendly accounts",
      "Supplier RFQ portal on top 5 suppliers",
      "Notification rules",
      "Branding + rollout"
    ]
  },
  {
    number: 6,
    title: "AI & Automation",
    tagline: "The system starts doing the busywork",
    businessValue:
      "Layered automation: auto job progression, approval workflows with digital signatures, exception-based notifications, and AI assistance where it provably pays — quoting from historical cycle times, SOP answers on the floor, anomaly flags on quality and downtime data. The Shop-Management layer already runs a citation-grounded SOP assistant and a self-improving cycle-time estimator; this phase extends that pattern.",
    features: [
      "Auto job progression (scripted transitions when operations complete)",
      "Approval workflows + digital signature fields on controlled docs",
      "Exception engine: only notify on breach/risk (SLA model already live for tickets)",
      "AI-assisted quoting from the cycle-time history (live today, keeps learning)",
      "SOP Knowledge Base assistant on the floor (live today, citations-only)",
      "Quality/downtime anomaly flags; predictive maintenance from PM + downtime history"
    ],
    dependencies: ["Phases 2–3 data (actuals, inspections, downtime) — AI is only as good as the captured data"],
    effort: "Ongoing; each automation is a 1–2 week slice once data exists",
    upgradeImpact: "Low",
    technicalRisk: "Medium",
    maintenanceBurden: "Medium",
    roi: "Compounding: every automation removes a recurring manual task. Quoting accuracy improves every month the feedback loop runs.",
    implementationOrder: [
      "Notification/exception rules",
      "Approval workflows + signatures",
      "Auto job progression",
      "Anomaly flags on quality + downtime",
      "Predictive maintenance"
    ]
  }
];
