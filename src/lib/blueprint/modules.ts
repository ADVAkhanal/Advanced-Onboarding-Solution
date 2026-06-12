import type { FunctionalArea } from "./types";

/**
 * Functional-area fit-gap. Every feature ran the same 10-step evaluation:
 * does ERPNext support it natively → configuration → custom doctype →
 * workflow → scripting → custom app; complexity, maintenance burden, upgrade
 * risk; then the most maintainable recommendation. "Custom App" means the
 * Shop-Management layer; custom doctypes live in the advanced_pmc Frappe app.
 * Capability statements target ERPNext v15.
 */
export const FUNCTIONAL_AREAS: FunctionalArea[] = [
  {
    key: "executive-dashboard",
    title: "Executive Dashboard",
    phase: 1,
    summary:
      "Real-time company health: revenue, profitability, on-time delivery, capacity and machine utilization, inventory/WIP valuation, labor efficiency, quality metrics.",
    features: [
      {
        feature: "Revenue / profitability / inventory valuation tiles",
        erpnext: "Native — Dashboards, Number Cards, and chart blocks over Sales Invoice, GL, and Stock Ledger.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Configure ERPNext number cards for financial tiles; no code."
      },
      {
        feature: "On-time delivery %",
        erpnext: "Partial — delivery dates exist on SO/DN; the OTD ratio needs a saved report or script report.",
        path: "Scripting",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "One query report (delivered-by-promised ÷ delivered) pinned to the dashboard."
      },
      {
        feature: "Capacity & machine utilization",
        erpnext: "Weak natively — workstation hours exist but no utilization analytics.",
        path: "Custom App",
        complexity: "Medium",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Already live: the Capacity Heatmap and Shop Health dashboards in the Shop-Management layer; bridge ERPNext work orders in as the source."
      },
      {
        feature: "WIP valuation & labor efficiency",
        erpnext: "Native data (Work Order costing, Job Card time logs); presentation needs a report.",
        path: "Scripting",
        complexity: "Medium",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Script report over Work Order WIP accounts + job-card actual vs planned hours."
      },
      {
        feature: "Quality metrics (FPY, NCR trend)",
        erpnext: "Data native once QM is used; KPI presentation is custom.",
        path: "Hybrid",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Already live: First-Piece/FPY and Support Desk dashboards; extend with NCR trend from ERPNext Quality module."
      }
    ],
    competitors: {
      proshop: "Strong KPI dashboards but fixed layouts; limited self-serve KPI building.",
      fulcrum: "Polished real-time dashboards; limited financial depth.",
      jobboss: "Reporting is batch/report-writer era; real-time views are weak.",
      gss: "Deep data, dashboard UX dated; heavy consultant dependence to change.",
      edge: "Registry-driven dashboard engine already shipping — a new KPI is a data loader, not a project; CSV/PDF on everything.",
      weakness: "Financial tiles depend on disciplined ERPNext accounting adoption — stage after Phase 1 data is trustworthy."
    }
  },
  {
    key: "crm",
    title: "CRM & Quoting",
    phase: 1,
    summary: "Customer management, quoting with revision history, opportunity/RFQ tracking, customer portal.",
    features: [
      {
        feature: "Lead → opportunity → quotation pipeline",
        erpnext: "Native (CRM module + Selling).",
        path: "Native",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Use as shipped; configure stages and lost-reason codes."
      },
      {
        feature: "Quote revision history",
        erpnext: "Native-ish — amend/cancel keeps prior versions; document versioning logs field changes.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Enable versioning on Quotation; revision = amended doc, naming series shows -1, -2."
      },
      {
        feature: "Manufacturing-aware quote estimating (cycle-time driven)",
        erpnext: "Not native — costing exists but no historical cycle-time lookup.",
        path: "Custom App",
        complexity: "Medium",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "Already live: Shop-Management quoting engine with the self-improving CycleTimeLookup (SEED→MANUAL→DERIVED). This is the structural moat vs every competitor."
      },
      {
        feature: "Customer RFQ intake",
        erpnext: "Opportunity + portal web forms cover it.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Portal web form creating Opportunities; route by item group."
      },
      {
        feature: "Customer portal (orders, status)",
        erpnext: "Native website portal shows SOs, invoices, shipments to logged-in customers.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Phase 5: theme the native portal; no custom build."
      }
    ],
    competitors: {
      proshop: "Quoting tied to estimating templates; solid but rigid, no learning loop.",
      fulcrum: "Modern quoting UI; estimating not self-improving.",
      jobboss: "Quote/estimating present but desktop-era; revisions clunky.",
      gss: "Capable estimating, steep configuration burden.",
      edge: "Quotes priced from the shop's own recorded actuals that improve monthly — none of the four close that loop automatically.",
      weakness: "ERPNext CRM is lighter than dedicated CRMs; if outside-sales workflows grow, add Frappe CRM app rather than customizing core."
    }
  },
  {
    key: "sales",
    title: "Sales Operations",
    phase: 1,
    summary: "Sales orders, order tracking, delivery management, shipment tracking, communication history.",
    features: [
      {
        feature: "Sales orders + order-to-ship tracking",
        erpnext: "Native (SO → Delivery Note → Shipment doctype with carrier/tracking).",
        path: "Native",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Use as shipped; % delivered/billed indicators are built in."
      },
      {
        feature: "Customer communication history",
        erpnext: "Native — every email against a doc is threaded on its timeline; Email Accounts pull replies in.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Connect the sales mailbox; communication lands on the right SO automatically."
      },
      {
        feature: "Late-order risk surfacing",
        erpnext: "Data native; proactive risk view is custom.",
        path: "Custom App",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Already live: ProShop Backlog/Scheduling dashboards pattern — repoint at ERPNext SOs via the bridge."
      }
    ],
    competitors: {
      proshop: "Order tracking good, communications live outside the system.",
      fulcrum: "Clean order flow; shipping integrations young.",
      jobboss: "Functional but multi-screen; email lives in Outlook.",
      gss: "Complete but heavyweight for a job shop's pace.",
      edge: "Threaded comms on the order record + dashboard risk views; zero swivel-chair.",
      weakness: "Carrier-rate shopping (UPS/FedEx APIs) not native — integrate a shipping app later if volume demands."
    }
  },
  {
    key: "purchasing",
    title: "Purchasing & Suppliers",
    phase: 1,
    summary: "Supplier management, POs, vendor scorecards, lead-time tracking, cost history, performance analytics.",
    features: [
      {
        feature: "Supplier master + POs + receipts",
        erpnext: "Native, including 3-way match.",
        path: "Native",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Use as shipped."
      },
      {
        feature: "Vendor scorecards",
        erpnext: "Native — Supplier Scorecard doctype with weighted criteria, periods, and standings.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Configure criteria (OTD, quality via receiving NCRs, price variance); few shops know ERPNext ships this."
      },
      {
        feature: "Lead-time & cost history",
        erpnext: "Native — item-supplier lead times; price trends from Purchase Receipt/Invoice reports.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Maintain lead times on Item Supplier; pin the price-trend report."
      },
      {
        feature: "Supplier RFQ portal",
        erpnext: "Native — Request for Quotation gives suppliers a portal login to submit quotes.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Phase 5; kills quote-by-email ping-pong."
      }
    ],
    competitors: {
      proshop: "Supplier quality tracking strong (AS9100 lens); scorecards manual.",
      fulcrum: "Purchasing thinner than its MES core.",
      jobboss: "POs fine; analytics weak.",
      gss: "Capable; configuration heavy.",
      edge: "Native weighted scorecards + supplier portal at zero license cost.",
      weakness: "Scorecard quality criteria need Phase 3 receiving inspections to be meaningful — sequence accordingly."
    }
  },
  {
    key: "inventory",
    title: "Inventory & Materials",
    phase: 1,
    summary: "Real-time visibility, barcode transactions, serial/lot, bins, traceable moves, cycle counting, replenishment.",
    features: [
      {
        feature: "Real-time stock ledger + bin/warehouse tree",
        erpnext: "Native; every transaction posts to the ledger instantly.",
        path: "Native",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Model bins as child warehouses; valuation comes free."
      },
      {
        feature: "Barcode transactions",
        erpnext: "Native — item barcodes scan into stock entries, delivery, receipts, POS.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Label items + bins; scan-first receiving/issue from day one."
      },
      {
        feature: "Serialized + lot (batch) inventory",
        erpnext: "Native — Serial No and Batch with expiry; v15 serial/batch bundle.",
        path: "Native",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Lot-control all raw material at receipt; serials where customers require."
      },
      {
        feature: "Cycle counting",
        erpnext: "Partial — Stock Reconciliation exists; no count-schedule generator.",
        path: "Scripting",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Scheduled server script creates ABC-based count tasks; counts post as reconciliations."
      },
      {
        feature: "Automated replenishment",
        erpnext: "Native — reorder levels auto-create Material Requests.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Set reorder level/qty per item-warehouse; buyer works the generated MR queue."
      }
    ],
    competitors: {
      proshop: "Inventory adequate; barcode flows less fluid.",
      fulcrum: "Good modern inventory; lot genealogy lighter.",
      jobboss: "Inventory accuracy notoriously operator-dependent; weak barcode UX.",
      gss: "Strong inventory; complexity tax on small teams.",
      edge: "Ledger-true valuation + native serial/lot + barcode at no per-seat cost.",
      weakness: "Native mobile scanning UI is functional, not delightful — Phase 2 wraps the highest-frequency flows in the touch layer."
    }
  },
  {
    key: "mes",
    title: "Manufacturing Execution (MES)",
    phase: 2,
    summary: "Work orders, electronic travelers, shop terminals, operator dashboards, machine status, downtime, labor, real-time reporting.",
    features: [
      {
        feature: "Work orders + job cards (operator start/stop)",
        erpnext: "Native — Job Cards per operation with time logs, employee, qty, status.",
        path: "Native",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Job Card is the floor transaction record; one per operation."
      },
      {
        feature: "Electronic traveler / digital job packet",
        erpnext: "Partial — print formats + attachments cover the paper traveler.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Traveler print format with QR per operation; drawings as controlled attachments."
      },
      {
        feature: "Touchscreen shop-floor terminals",
        erpnext: "Weak — desk-form UI, not glove-friendly.",
        path: "Custom App",
        complexity: "Medium",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "Shop-Management operator screen: scan QR → big Start/Stop/Complete/Scrap buttons → writes Job Cards via API. The single highest-leverage custom build."
      },
      {
        feature: "Downtime tracking",
        erpnext: "Native — Downtime Entry doctype against workstations with reasons.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Reason-coded Downtime Entries; trend on the Maintenance Health dashboard (already live)."
      },
      {
        feature: "Machine status board + real-time production reporting",
        erpnext: "Data native (job cards in-progress), no live board.",
        path: "Custom App",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Already live: maintenance machine board + shift handoff with down-sync; add a running-jobs board from bridged Job Cards."
      },
      {
        feature: "Labor tracking",
        erpnext: "Native — job-card time logs roll into work-order costing.",
        path: "Native",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Scan-on/scan-off via the operator screen; actuals feed the quoting loop."
      }
    ],
    competitors: {
      proshop: "Excellent paperless travelers — the benchmark; UI dated, cost scales per seat.",
      fulcrum: "Best-in-class floor UX; scheduling/quality depth thinner.",
      jobboss: "Data collection bolt-ons; real-time visibility poor.",
      gss: "Full MES but training-heavy for operators.",
      edge: "Job-card data model + a purpose-built touch layer matches ProShop's travelers and Fulcrum's UX without per-seat fees — and actuals feed quoting automatically.",
      weakness: "Machine-signal capture (IoT) not in scope yet; downtime is operator-declared until Phase 6 sensors."
    }
  },
  {
    key: "qms",
    title: "Quality Management (QMS)",
    phase: 3,
    summary: "FAI, in-process/final inspection, NCR, CAPA, calibration/gauge management, audits, scorecards.",
    features: [
      {
        feature: "Inspection plans + in-process/incoming/final inspections",
        erpnext: "Native — Quality Inspection + templates with numeric/visual criteria, linked to receipts/deliveries/job cards.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Templates per item/operation; inspections required before stock moves (setting)."
      },
      {
        feature: "First-article (AS9102-style) packages",
        erpnext: "Not native as a form set.",
        path: "Configuration",
        complexity: "Medium",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "FAI = Quality Inspection template + AS9102-style print formats; characteristics keyed once. First-Piece tracker (live) handles the prove-out workflow."
      },
      {
        feature: "NCR → CAPA",
        erpnext: "Native — Non Conformance, Quality Action, Quality Procedure/Goal/Review in the QM module.",
        path: "Workflow",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Workflow states on Quality Action (containment → root cause → action → verify) with role-gated transitions."
      },
      {
        feature: "Calibration & gauge management",
        erpnext: "Not native (Asset maintenance approximates poorly).",
        path: "Custom DocType",
        complexity: "Medium",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "Two doctypes in advanced_pmc: Gauge (id, range, location) + Calibration Record (append-only, due-date driven); notification on coming-due."
      },
      {
        feature: "Audit management + quality scorecards",
        erpnext: "Partial — Quality Review/Goal cover internal audit cadence; scorecards are reports.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Quality Goals for audit schedule; scorecard KPIs join the dashboard registry."
      }
    ],
    competitors: {
      proshop: "Its crown jewel — built-in AS9100 QMS. The bar to clear.",
      fulcrum: "Quality is the thinnest part of its story.",
      jobboss: "Quality add-on, separate feel.",
      gss: "Quality module solid; usability so-so.",
      edge: "90% of ProShop's QMS via native QM + templates + two custom doctypes — with evidence generated as a by-product of job cards, not parallel paperwork.",
      weakness: "Document-controlled QMS manual (tiered procedures) needs Phase 3 discipline in Frappe's document versioning; assign ownership early."
    }
  },
  {
    key: "traceability",
    title: "Traceability & Genealogy",
    phase: 3,
    summary: "Full material/lot/serial genealogy, operator history, inspection history, supplier→customer chain.",
    features: [
      {
        feature: "Lot/serial genealogy (raw → WIP → shipped)",
        erpnext: "Data fully native (stock ledger + batch/serial on every move); the tree view is not.",
        path: "Scripting",
        complexity: "Medium",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "One script report walking the ledger both directions from any lot/serial; render the tree in the Shop-Management layer."
      },
      {
        feature: "Operator + inspection history per part",
        erpnext: "Native data — job cards carry employee, quality inspections carry inspector/results.",
        path: "Scripting",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Join job cards + inspections on work order into a 'part passport' report; print format = C of C backup."
      },
      {
        feature: "Supplier ↔ customer chain (recall query)",
        erpnext: "Derivable — receipt batch → consumed work orders → shipped DNs.",
        path: "Scripting",
        complexity: "Medium",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "The recall question ('this heat lot shipped to whom?') becomes one parameterized report. Drill it annually."
      }
    ],
    competitors: {
      proshop: "Strong traceability; queries can be slow/manual.",
      fulcrum: "Good lot tracking; genealogy depth moderate.",
      jobboss: "Lot tracking present, genealogy painful.",
      gss: "Capable; locked behind its report writer.",
      edge: "Ledger-true genealogy with a one-click recall query — most competitors reconstruct this manually under pressure.",
      weakness: "Only as good as scan discipline at issue/receipt; enforce 'no move without scan' from Phase 1."
    }
  },
  {
    key: "maintenance",
    title: "Maintenance Management",
    phase: 2,
    summary: "Preventive/predictive maintenance, schedules, asset management, spare parts.",
    features: [
      {
        feature: "PM schedules + work orders + assets",
        erpnext: "Native — Asset + Asset Maintenance (teams, schedules, tasks, logs).",
        path: "Native",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Already live ahead of plan: the Shop-Management Maintenance CMMS (machines, PM check-off with auto-roll, MRO, downtime, alerts). Keep it the system of engagement; mirror assets to ERPNext for depreciation only."
      },
      {
        feature: "Spare-parts (MRO) inventory",
        erpnext: "Native via Items, but mixes MRO into production stock.",
        path: "Custom App",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Already live: separate MRO registry with reorder/critical flags — deliberately outside production inventory."
      },
      {
        feature: "Predictive maintenance",
        erpnext: "Not native.",
        path: "Custom App",
        complexity: "High",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "Phase 6: start with downtime-history heuristics (MTBF flags) already computable from the CMMS data; sensors later only where payback is proven."
      }
    ],
    competitors: {
      proshop: "Basic equipment module.",
      fulcrum: "Light maintenance story.",
      jobboss: "Typically third-party CMMS alongside.",
      gss: "Has maintenance; underused due to complexity.",
      edge: "A real CMMS inside the same login as production — down machines hit capacity views and shift handoffs instantly. None of the four integrate this tightly.",
      weakness: "Depreciation/asset accounting stays in ERPNext — keep the mirror boundary clean."
    }
  },
  {
    key: "engineering",
    title: "Engineering & Document Control",
    phase: 3,
    summary: "Document/revision control, CAD management, drawing distribution, ECO workflow, BOM/routing management.",
    features: [
      {
        feature: "BOM + routing management (multi-level, versioned)",
        erpnext: "Native — versioned BOMs, BOM Update Tool for mass replace.",
        path: "Native",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "BOM revision = new BOM version; never edit a submitted BOM."
      },
      {
        feature: "Controlled documents + revision control",
        erpnext: "Partial — file attachments + document versioning; no approval-stamped doc register.",
        path: "Custom DocType",
        complexity: "Medium",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "Controlled Document doctype in advanced_pmc (number, rev, status, approver, effective date) with workflow; traveler links resolve to the released rev only."
      },
      {
        feature: "ECO workflow",
        erpnext: "Not native as a doctype.",
        path: "Custom DocType",
        complexity: "Medium",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "ECO doctype (affected items/BOMs/docs, disposition of WIP, approvals) + workflow; on approval, scripted BOM version bump."
      },
      {
        feature: "CAD file management & drawing distribution",
        erpnext: "Files work; CAD-aware preview/versioning is not core.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "PDFs/STEP as controlled attachments distributed via traveler QR. Native CAD vaulting stays in CAD-land — do not rebuild PDM. Export-controlled files never enter the system (boundary rule)."
      }
    ],
    competitors: {
      proshop: "Good doc control tied to its QMS.",
      fulcrum: "Lighter engineering layer.",
      jobboss: "Attachments, not control.",
      gss: "Engineering module exists; ECO flow rigid.",
      edge: "Workflow-stamped doc control + ECO in upgrade-safe custom doctypes; drawings reach the floor via QR at released-rev only.",
      weakness: "ITAR/CUI technical data is deliberately out of scope — controlled drawings live in the compliant enclave, referenced by number only."
    }
  },
  {
    key: "scheduling",
    title: "Scheduling & Planning",
    phase: 4,
    summary: "Finite capacity scheduling, what-if simulation, constraints, forecasting, demand planning.",
    features: [
      {
        feature: "Production planning (MRP)",
        erpnext: "Native — Production Plan nets demand from SOs/forecast into work orders + material requests.",
        path: "Native",
        complexity: "Medium",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Adopt Production Plan as the weekly planning ritual before any custom scheduling."
      },
      {
        feature: "Finite-capacity scheduling",
        erpnext: "Gap — capacity check exists but honest finite scheduling is ERPNext's weakest core area.",
        path: "Custom App",
        complexity: "High",
        maintenance: "Medium",
        upgradeRisk: "Medium",
        recommendation: "Scheduling board in the Shop-Management layer over bridged work orders: sequence per work center, capacity bars from the (live) heatmap data, commit writes planned dates back. Do not patch core capacity planning."
      },
      {
        feature: "What-if simulation",
        erpnext: "Not native.",
        path: "Custom App",
        complexity: "High",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "Trial schedules scored on lateness/utilization in-memory before commit — an extension of the scheduling board, not a separate system."
      },
      {
        feature: "Constraint visibility (material/tooling/people)",
        erpnext: "Partial — material availability native; tooling/operator constraints are not modeled.",
        path: "Custom DocType",
        complexity: "Medium",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "Lightweight Tooling + skills matrix doctypes; scheduler flags conflicts rather than hard-blocking."
      }
    ],
    competitors: {
      proshop: "Scheduling is queue-based, not truly finite.",
      fulcrum: "Auto-scheduling is its flagship; opaque when it misbehaves.",
      jobboss: "Whiteboard-grade scheduling.",
      gss: "Has APS; needs a specialist to drive.",
      edge: "Transparent, planner-driven finite board fed by real recorded cycle times — explainable beats black-box for a single-admin shop.",
      weakness: "Largest custom build in the roadmap; staged read-only → drag/commit → what-if to de-risk."
    }
  },
  {
    key: "automation",
    title: "Automation & Workflow",
    phase: 6,
    summary: "Barcode/QR, auto job progression, notification engine, approvals, digital signatures, AI assistance.",
    features: [
      {
        feature: "QR generation + barcode-first flows",
        erpnext: "Native barcodes; QR via print formats.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "QR on every traveler/operation/bin label; the operator screen consumes them."
      },
      {
        feature: "Automatic job progression",
        erpnext: "Scriptable — server script on job-card completion starts the next operation / moves stock.",
        path: "Scripting",
        complexity: "Medium",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "Small, individually-testable server scripts in advanced_pmc; never client-side magic."
      },
      {
        feature: "Notification engine (exception-based)",
        erpnext: "Native Notification doctype (events, conditions, channels).",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Notify only on exceptions (late, breach, down) — the SLA model already live for tickets is the template."
      },
      {
        feature: "Approval workflows + digital signatures",
        erpnext: "Native — Workflow engine + Signature field type.",
        path: "Workflow",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Signatures on FAI/ECO/CAPA transitions; workflow history is the audit trail."
      },
      {
        feature: "AI-assisted recommendations",
        erpnext: "Not native.",
        path: "Custom App",
        complexity: "Medium",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "Already live: citation-grounded SOP assistant + self-improving cycle-time quoting. Extend to anomaly flags (quality drift, downtime patterns) — assistive, never auto-acting."
      }
    ],
    competitors: {
      proshop: "Workflow automation modest.",
      fulcrum: "Markets AI scheduling; assistive AI elsewhere thin.",
      jobboss: "Minimal automation.",
      gss: "Scripting exists, consultant territory.",
      edge: "A working, grounded AI layer (citations-only SOP answers; quoting that learns) — shipped, not slideware.",
      weakness: "Keep AI assistive with humans approving; aerospace customers audit decisions, not vibes."
    }
  },
  {
    key: "bi",
    title: "Business Intelligence",
    phase: 6,
    summary: "Executive/production/quality/purchasing/inventory dashboards, custom KPI builder.",
    features: [
      {
        feature: "Role dashboards (exec/production/quality/purchasing/inventory)",
        erpnext: "Native dashboards + the Shop-Management registry engine.",
        path: "Hybrid",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Already live: ten registry dashboards with CSV/PDF. ERPNext native dashboards cover financial views; the registry covers operational ones."
      },
      {
        feature: "Custom KPI builder",
        erpnext: "Frappe Insights (separate app) gives drag-and-drop BI over the same DB.",
        path: "Configuration",
        complexity: "Medium",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Install Frappe Insights when ad-hoc analysis demand appears; read-only DB user, zero core risk."
      }
    ],
    competitors: {
      proshop: "Fixed reports + dashboards; ad-hoc weak.",
      fulcrum: "Good visuals, closed data model.",
      jobboss: "Crystal-Reports era.",
      gss: "Powerful but specialist-bound.",
      edge: "Open data model: registry dashboards for the daily pulse, Insights for ad-hoc, SQL if ever needed — no report-writer hostage situation.",
      weakness: "Two dashboard surfaces (ERPNext + layer) need a 'which lives where' convention: financial = ERPNext, operational = registry."
    }
  },
  {
    key: "security",
    title: "Security & Compliance",
    phase: 1,
    summary: "NIST 800-171 alignment, CMMC readiness, RBAC, audit logging, retention, backup validation, DR.",
    features: [
      {
        feature: "Role-based security",
        erpnext: "Native — role + permission-level model down to field level; the layer adds its own four-tier RBAC.",
        path: "Configuration",
        complexity: "Medium",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Map the four-tier model onto ERPNext roles once; least-privilege API user for the bridge (already enforced by the doctype allowlist)."
      },
      {
        feature: "Audit logging",
        erpnext: "Native — document versioning + activity log; the layer audit-logs every write already.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Low",
        upgradeRisk: "Low",
        recommendation: "Versioning on all controlled doctypes; periodic export of audit trails to immutable storage."
      },
      {
        feature: "NIST 800-171 / CMMC posture",
        erpnext: "Deployment-level, not a feature.",
        path: "Hybrid",
        complexity: "Medium",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "The load-bearing decision is architectural and already made: CUI/ITAR technical data never enters either system — they hold operational metadata only, referenced by number. TLS everywhere, MFA on admin, the bridge's code-enforced allowlist, and documented SSP mapping."
      },
      {
        feature: "Backups, retention, disaster recovery",
        erpnext: "Native scheduled backups; DR is process.",
        path: "Configuration",
        complexity: "Low",
        maintenance: "Medium",
        upgradeRisk: "Low",
        recommendation: "Nightly off-host encrypted backups (DB + files), 35-day retention, quarterly restore drill into staging — the drill is the control, not the backup."
      }
    ],
    competitors: {
      proshop: "Sells AS9100/CMMC alignment hard — credible.",
      fulcrum: "SaaS posture; CMMC story depends on their cloud.",
      jobboss: "Compliance largely on the customer.",
      gss: "On-prem control, on-prem burden.",
      edge: "Self-hosted control with a metadata-only boundary enforced in code, not policy — auditors can read the allowlist.",
      weakness: "Single-admin DR depends on drilled runbooks; automate the restore test so it cannot be skipped."
    }
  }
];

export function areasForPhase(phase: number): FunctionalArea[] {
  return FUNCTIONAL_AREAS.filter((a) => a.phase === phase);
}
