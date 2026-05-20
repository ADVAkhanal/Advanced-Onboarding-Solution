import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileArchive,
  FileCheck2,
  FileSpreadsheet,
  FolderKanban,
  Gauge,
  Handshake,
  HardHat,
  HelpCircle,
  IdCard,
  Inbox,
  ListChecks,
  NotebookPen,
  PackageCheck,
  PanelTop,
  ScrollText,
  Settings,
  ShieldCheck,
  Timer,
  UserCheck,
  UserCog,
  Users,
  WalletCards,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const PRODUCT_NAME = "Advanced Shop Management & Onboarding Command Center";
export const SHORT_NAME = "Advanced Shop Command Center";
export const COMMERCIAL_NAME = "CleanOps Command Center";
export const TAGLINE = "Onboarding · Payroll · Tickets · Tasks · Managers · Accountability";
export const BRAND_FOOTER = "Stronger Shops. Stronger Teams. Real Results.";
export const DISCLAIMER =
  "This platform supports internal management, onboarding, payroll coordination, department ticketing, productivity tracking, and employee lifecycle documentation. It does not process payments, store banking credentials, replace payroll tax systems, or directly modify HR, payroll, accounting, IT, or production systems unless an approved integration is explicitly configured.";

export const USER_LEVELS = [
  {
    key: "LEVEL_1",
    label: "Level 1 User",
    purpose: "Standard employee, new hire, contractor, temp worker, or shop-floor user."
  },
  {
    key: "MANAGER",
    label: "Manager",
    purpose: "Department owner responsible for people, tickets, onboarding, payroll coordination, scheduling issues, productivity, and follow-through."
  },
  {
    key: "DIRECTOR",
    label: "Director",
    purpose: "Cross-department oversight, escalation authority, and operational accountability."
  },
  {
    key: "GLOBAL_ADMIN",
    label: "Global Admin / CEO",
    purpose: "System owner, executive controller, and full administrator."
  }
] as const;

export const DEPARTMENTS = [
  { code: "IT", name: "IT", center: "IT Ticket Center" },
  { code: "HR", name: "HR", center: "HR Ticket Center" },
  { code: "PAYROLL", name: "Payroll", center: "Payroll Ticket Center" },
  { code: "MAINT", name: "Maintenance", center: "Maintenance Ticket Center" },
  { code: "QUALITY", name: "Quality", center: "Quality Ticket Center" },
  { code: "ENG", name: "Engineering", center: "Engineering Ticket Center" },
  { code: "PROD", name: "Production", center: "Production Ticket Center" },
  { code: "SHIP", name: "Shipping / Receiving", center: "Shipping / Receiving Ticket Center" },
  { code: "ADMIN", name: "Office / Admin", center: "Office / Admin Ticket Center" },
  { code: "TOOL", name: "Tool Crib", center: "Tool Crib Ticket Center" },
  { code: "PURCH", name: "Purchasing", center: "Purchasing Ticket Center" },
  { code: "FAC", name: "Facilities", center: "Facilities Ticket Center" },
  { code: "SAFETY", name: "Safety", center: "Safety Ticket Center" },
  { code: "MGMT", name: "Management", center: "Management Ticket Center" }
] as const;

export const TICKET_STATUSES = [
  "New",
  "Assigned",
  "In Progress",
  "Waiting on Requester",
  "Waiting on Manager",
  "Waiting on Director",
  "Waiting on External Vendor",
  "Blocked",
  "Escalated",
  "Resolved",
  "Closed",
  "Reopened",
  "Cancelled"
] as const;

export const TICKET_PRIORITIES = ["Low", "Normal", "High", "Urgent", "Work Stoppage"] as const;

export const TICKET_CATEGORIES: Record<string, string[]> = {
  PAYROLL: [
    "missed punch",
    "time correction",
    "pay question",
    "rate change request",
    "bonus request",
    "deduction question",
    "reimbursement request",
    "payroll export issue",
    "PTO balance question",
    "schedule/pay period issue"
  ],
  HR: [
    "onboarding question",
    "document request",
    "policy acknowledgment",
    "employee information update",
    "training assignment",
    "performance documentation",
    "contractor record",
    "employee status change",
    "termination preparation",
    "general HR request"
  ],
  MAINT: [
    "machine issue",
    "facility repair",
    "safety hazard",
    "tool repair",
    "equipment inspection",
    "preventive maintenance",
    "urgent downtime",
    "supplies needed"
  ],
  QUALITY: [
    "inspection issue",
    "nonconformance coordination",
    "document clarification",
    "training needed",
    "customer quality request",
    "calibration coordination",
    "process question"
  ],
  PROD: [
    "job issue",
    "material shortage",
    "schedule conflict",
    "staffing issue",
    "machine assignment",
    "production blocker",
    "overtime request",
    "shift handoff"
  ],
  ENG: [
    "drawing question",
    "programming request",
    "revision clarification",
    "process improvement",
    "fixture request",
    "tooling support",
    "technical review"
  ],
  SHIP: [
    "shipment issue",
    "receiving issue",
    "packing question",
    "carrier issue",
    "customer shipment request",
    "material delivery issue"
  ],
  ADMIN: ["supplies", "visitor coordination", "contact update", "document request", "meeting support", "general admin task"]
};

const defaultCategories = [
  "access request",
  "resource request",
  "department question",
  "manager review",
  "approval needed",
  "blocker",
  "general request"
];

export function categoriesForDepartment(code: string) {
  return TICKET_CATEGORIES[code] ?? defaultCategories;
}

export const PAYROLL_REQUEST_TYPES = [
  "pay rate change",
  "salary adjustment",
  "hourly wage adjustment",
  "bonus",
  "incentive",
  "reimbursement",
  "missed punch correction",
  "time correction",
  "department change",
  "job title change",
  "shift differential",
  "overtime correction",
  "PTO correction",
  "unpaid time note",
  "payroll note",
  "payroll question"
] as const;

export const PAYROLL_STATUSES = [
  "Draft",
  "Submitted",
  "Manager Review",
  "Director Review",
  "Payroll Review",
  "Needs More Info",
  "Approved for Payroll Entry",
  "Exported to Payroll Processor",
  "Completed",
  "Rejected",
  "Cancelled",
  "Archived"
] as const;

export const TIME_OFF_TYPES = [
  "PTO",
  "unpaid time",
  "sick time",
  "bereavement",
  "jury duty",
  "holiday",
  "personal time",
  "partial day",
  "late arrival",
  "early departure",
  "other"
] as const;

export const ATTENDANCE_ISSUE_TYPES = [
  "missed punch",
  "late arrival",
  "early departure",
  "absence",
  "schedule conflict",
  "shift swap",
  "overtime note",
  "unpaid time note",
  "payroll correction needed",
  "manager documentation note"
] as const;

export const ONBOARDING_TYPES = [
  "new hire",
  "contractor",
  "temp worker",
  "intern",
  "rehire",
  "seasonal worker",
  "department transfer",
  "role change",
  "promotion",
  "shift change",
  "location change"
] as const;

export type WorkflowModule = {
  slug: string;
  title: string;
  navLabel: string;
  icon: LucideIcon;
  summary: string;
  owner: string;
  primaryAction: string;
  secondaryAction: string;
  metricLabels: string[];
  workflows: string[];
  fields: string[];
  statuses: string[];
  reports: string[];
};

export const WORKFLOW_MODULES: WorkflowModule[] = [
  {
    slug: "executive-command-dashboard",
    title: "Executive Command Dashboard",
    navLabel: "Command Dashboard",
    icon: Gauge,
    summary: "Company-wide organization health across tickets, onboarding, payroll coordination, approvals, blockers, and manager follow-through.",
    owner: "Global Admin / CEO",
    primaryAction: "Generate Operations Summary",
    secondaryAction: "Open Urgent Queue",
    metricLabels: ["Open tickets", "Overdue tickets", "Payroll readiness", "Onboarding readiness"],
    workflows: ["Company operations health", "Urgent action queue", "Manager accountability leaderboard", "Department health comparison"],
    fields: ["department", "manager", "date range", "filters", "summary metrics", "report ID"],
    statuses: ["Healthy", "Needs Attention", "Blocked", "Escalated"],
    reports: ["Company Operations Summary", "Department Health Report", "Manager Accountability Report"]
  },
  {
    slug: "director-oversight-dashboard",
    title: "Director Oversight Dashboard",
    navLabel: "Director Oversight",
    icon: PanelTop,
    summary: "Cross-department dashboard for bottlenecks, manager productivity, escalated issues, payroll approvals, and workforce readiness.",
    owner: "Director",
    primaryAction: "Approve Escalation",
    secondaryAction: "Request Manager Update",
    metricLabels: ["Departments watched", "Escalations", "Payroll approvals", "Manager tasks overdue"],
    workflows: ["Reassign ownership", "Approve exceptions", "Review manager KPIs", "Resolve bottlenecks"],
    fields: ["department", "manager", "approval type", "escalation reason", "director note"],
    statuses: ["Pending", "Approved", "Needs Update", "Resolved"],
    reports: ["Director Oversight Report", "Department Workload Report", "Escalation Report"]
  },
  {
    slug: "manager-dashboard",
    title: "Manager Dashboard",
    navLabel: "Manager Dashboard",
    icon: BriefcaseBusiness,
    summary: "Department command center for tickets, onboarding, payroll requests, time-off, attendance, recurring checklists, blockers, and follow-ups.",
    owner: "Manager",
    primaryAction: "Create Department Ticket",
    secondaryAction: "Create Follow-Up",
    metricLabels: ["Open department tickets", "Waiting on manager", "New hires starting", "Follow-ups due"],
    workflows: ["Assign tasks", "Approve time-off", "Submit payroll request", "Escalate issue"],
    fields: ["department", "owner", "due date", "priority", "linked employee", "status"],
    statuses: ["New", "Waiting on Manager", "Blocked", "Complete"],
    reports: ["Manager Weekly Summary", "Department Productivity Report", "Manager Follow-Up Report"]
  },
  {
    slug: "level-1-user-portal",
    title: "Level 1 User Portal",
    navLabel: "Employee Portal",
    icon: UserCheck,
    summary: "Simple employee portal for personal tasks, tickets, onboarding steps, payroll questions, time-off, schedule issues, training, and documents.",
    owner: "Level 1 User",
    primaryAction: "Submit Request",
    secondaryAction: "Complete Task",
    metricLabels: ["My open tickets", "My tasks", "My time-off requests", "My documents"],
    workflows: ["Submit ticket", "Submit payroll question", "Acknowledge document", "View request status"],
    fields: ["request type", "title", "description", "department", "attachment", "comments"],
    statuses: ["Submitted", "In Progress", "Waiting", "Complete"],
    reports: ["Employee Task Report", "Training Assignment Report", "Policy Acknowledgment Report"]
  },
  {
    slug: "department-ticket-centers",
    title: "Department Ticket Centers",
    navLabel: "Department Tickets",
    icon: Inbox,
    summary: "Separate department ticket queues with ownership rules, categories, due dates, comments, internal notes, attachments, escalations, and aging reports.",
    owner: "Managers, Directors, Global Admin",
    primaryAction: "Create Ticket",
    secondaryAction: "Bulk Update",
    metricLabels: ["Open", "Overdue", "Work stoppage", "Average resolution"],
    workflows: ["Assign ticket", "Transfer department", "Add internal note", "Reopen closed ticket"],
    fields: ["ticket ID", "department", "category", "requested by", "assigned owner", "priority", "status", "due date"],
    statuses: [...TICKET_STATUSES],
    reports: ["Ticket Aging Report", "Department Backlog Report", "Owner Workload Report"]
  },
  {
    slug: "onboarding-request-center",
    title: "Onboarding Request Center",
    navLabel: "Onboarding Requests",
    icon: UserCog,
    summary: "Manager-initiated onboarding requests for new hires, contractors, temps, interns, rehires, role changes, transfers, and shift/location changes.",
    owner: "Manager",
    primaryAction: "Create Onboarding Request",
    secondaryAction: "Apply Template",
    metricLabels: ["Drafts", "Submitted", "Missing info", "Ready for HR"],
    workflows: ["Duplicate detection", "Missing information warnings", "Template task generation", "Approval routing"],
    fields: ["first name", "last name", "department", "job title", "manager", "start date", "shift", "location"],
    statuses: ["Draft", "Submitted", "Manager Review", "Director Review", "HR Review"],
    reports: ["Onboarding Readiness Report", "First-Day Readiness Report"]
  },
  {
    slug: "onboarding-case-management",
    title: "Onboarding Case Management",
    navLabel: "Onboarding Cases",
    icon: ClipboardCheck,
    summary: "Full onboarding case detail with payroll coordination, equipment, workspace, training, acknowledgments, milestones, tasks, tickets, blockers, approvals, and timeline.",
    owner: "HR, Manager, Director",
    primaryAction: "Update Case Status",
    secondaryAction: "Generate Summary",
    metricLabels: ["Readiness score", "Tasks complete", "Blockers", "Milestones due"],
    workflows: ["Create payroll handoff", "Create equipment request", "Add blocker", "Escalate to director"],
    fields: ["employee summary", "job details", "readiness", "approvals", "documents", "audit history"],
    statuses: ["Payroll Setup Pending", "Ready for First Day", "Active Onboarding", "30-Day Review", "Complete"],
    reports: ["First-Week Readiness Report", "30/60/90-Day Review Report"]
  },
  {
    slug: "contractor-temp-worker-onboarding",
    title: "Contractor / Temp Worker Onboarding",
    navLabel: "Contractor Onboarding",
    icon: IdCard,
    summary: "Scoped onboarding for contractors and temp workers with start/end tracking, access requests, equipment, training, acknowledgments, and expiration reminders.",
    owner: "Manager, HR",
    primaryAction: "Create Contractor Case",
    secondaryAction: "Review Expirations",
    metricLabels: ["Active contractors", "Starting soon", "Expiring soon", "Missing setup"],
    workflows: ["Create limited-access checklist", "Track extension", "Coordinate badge/key", "Archive completed contract"],
    fields: ["contractor name", "vendor company", "department", "manager", "start date", "end date", "access summary"],
    statuses: ["Draft", "Submitted", "Setup Pending", "Active", "Expiring", "Archived"],
    reports: ["Contractor Expiration Report", "Workforce Readiness Brief"]
  },
  {
    slug: "rehire-workflow",
    title: "Rehire Workflow",
    navLabel: "Rehire Workflow",
    icon: Handshake,
    summary: "Rehire requests with previous employee lookup, approval routing, refreshed onboarding tasks, payroll coordination handoff, and manager readiness tracking.",
    owner: "Manager, HR, Director",
    primaryAction: "Start Rehire",
    secondaryAction: "Review Previous Record",
    metricLabels: ["Pending rehires", "Director review", "Ready for first day", "Blocked"],
    workflows: ["Review prior profile", "Create rehire request", "Generate rehire checklist", "Link lifecycle event"],
    fields: ["employee", "department", "proposed start date", "manager", "reason", "approval history"],
    statuses: ["Submitted", "Manager Review", "Director Review", "HR Review", "Ready"],
    reports: ["Employee Lifecycle Report", "Onboarding Readiness Report"]
  },
  {
    slug: "transfer-role-change-workflow",
    title: "Transfer / Role Change Workflow",
    navLabel: "Transfers & Role Changes",
    icon: Users,
    summary: "Structured department transfers, promotions, shift changes, manager changes, and job title changes with approvals and payroll coordination records.",
    owner: "Manager, Director",
    primaryAction: "Create Change Request",
    secondaryAction: "Route Approval",
    metricLabels: ["Open changes", "Payroll handoffs", "Director approvals", "Effective this week"],
    workflows: ["Request transfer", "Request role change", "Create lifecycle event", "Notify departments"],
    fields: ["employee", "from department", "to department", "effective date", "reason", "payroll impact"],
    statuses: ["Submitted", "Manager Review", "Director Review", "Payroll Review", "Complete"],
    reports: ["Employee Lifecycle Report", "Payroll Coordination Summary"]
  },
  {
    slug: "payroll-coordination-center",
    title: "Payroll Coordination Center",
    navLabel: "Payroll Coordination",
    icon: WalletCards,
    summary: "Payroll coordination workflows for safe change requests, time corrections, bonuses, reimbursements, review checklists, approvals, and limited exports.",
    owner: "Payroll Admin, Manager, Director",
    primaryAction: "Create Payroll Request",
    secondaryAction: "Review Period Checklist",
    metricLabels: ["Pending approvals", "Needs payroll review", "Export ready", "Exceptions"],
    workflows: ["Submit pay change", "Director approve", "Payroll review", "Generate safe export"],
    fields: ["request ID", "employee", "request type", "effective date", "business reason", "approval history", "export status"],
    statuses: [...PAYROLL_STATUSES],
    reports: ["Payroll Coordination Summary", "Pending Payroll Approval Report", "Payroll Period Readiness Report"]
  },
  {
    slug: "time-off-request-center",
    title: "Time-Off Request Center",
    navLabel: "Time-Off Requests",
    icon: CalendarClock,
    summary: "Time-off request coordination with coverage notes, blackout warnings, manager decisions, payroll handoff flags, and request history.",
    owner: "Employee, Manager",
    primaryAction: "Submit Time-Off Request",
    secondaryAction: "Review Team Calendar",
    metricLabels: ["Submitted", "Needs coverage", "Approved", "Payroll notified"],
    workflows: ["Employee submit", "Manager review", "Coverage check", "Export summary"],
    fields: ["employee", "time-off type", "start date", "end date", "coverage plan", "payroll note required"],
    statuses: ["Draft", "Submitted", "Manager Review", "Approved", "Rejected", "Needs Coverage Plan", "Payroll Notified", "Completed", "Cancelled"],
    reports: ["Time-Off Request Report", "Department Coverage Report"]
  },
  {
    slug: "attendance-schedule-issue-center",
    title: "Attendance & Schedule Issue Center",
    navLabel: "Attendance & Schedule",
    icon: Timer,
    summary: "Non-sensitive attendance coordination for missed punches, late arrivals, absences, shift swaps, overtime notes, and payroll correction handoffs.",
    owner: "Employee, Manager, Payroll",
    primaryAction: "Submit Schedule Issue",
    secondaryAction: "Generate Payroll Ticket",
    metricLabels: ["Needs manager review", "Payroll impact", "Recurring issues", "Resolved"],
    workflows: ["Self-submit issue", "Manager review", "Payroll handoff", "Export attendance summary"],
    fields: ["employee", "issue type", "date", "shift", "description", "correction needed", "payroll impact"],
    statuses: ["Submitted", "Manager Review", "Payroll Handoff", "Resolved", "Cancelled"],
    reports: ["Attendance Issue Report", "Time Correction Report"]
  },
  {
    slug: "employee-lifecycle-records",
    title: "Employee Lifecycle Records",
    navLabel: "Employee Lifecycle",
    icon: FileCheck2,
    summary: "Non-sensitive lifecycle events for onboarding, role changes, manager changes, training assignments, attendance notes, milestones, contractor extensions, and exit handoffs.",
    owner: "Manager, HR, Director",
    primaryAction: "Add Lifecycle Event",
    secondaryAction: "Link Related Record",
    metricLabels: ["Open events", "Pending milestones", "Role changes", "Contractor expirations"],
    workflows: ["Create event", "Restrict visibility", "Link tickets", "Export lifecycle report"],
    fields: ["employee", "event type", "department", "manager", "effective date", "visibility", "related records"],
    statuses: ["Open", "In Review", "Complete", "Archived"],
    reports: ["Employee Lifecycle Report", "Contractor Expiration Report"]
  },
  {
    slug: "manager-task-board",
    title: "Manager Task Board",
    navLabel: "Manager Tasks",
    icon: FolderKanban,
    summary: "Manager-owned task board for due dates, priorities, linked employees, linked onboarding cases, tickets, payroll requests, blockers, and completion notes.",
    owner: "Manager",
    primaryAction: "Create Task",
    secondaryAction: "Assign Owner",
    metricLabels: ["Due today", "Overdue", "Blocked", "Needs review"],
    workflows: ["Create task", "Link ticket", "Add blocker", "Approve completion"],
    fields: ["title", "owner", "assigned by", "department", "priority", "due date", "status"],
    statuses: ["Not Started", "In Progress", "Waiting", "Blocked", "Needs Review", "Complete", "Cancelled", "Archived"],
    reports: ["Employee Task Report", "Manager Weekly Summary"]
  },
  {
    slug: "department-productivity-board",
    title: "Department Productivity Board",
    navLabel: "Productivity Board",
    icon: BarChart3,
    summary: "Kanban/table hybrid for Today, This Week, Overdue, Waiting, Blocked, New Hires, Payroll Items, Time-Off, Tickets, Follow-Ups, and Completed.",
    owner: "Manager",
    primaryAction: "Create Board Item",
    secondaryAction: "Switch View",
    metricLabels: ["Today", "This week", "Overdue", "Completed"],
    workflows: ["View by workload", "Move status", "Link request", "Export productivity report"],
    fields: ["task", "owner", "priority", "linked employee", "blocker reason", "completion notes"],
    statuses: ["Not Started", "In Progress", "Waiting", "Blocked", "Needs Review", "Complete"],
    reports: ["Department Productivity Report", "Blocked Items Report"]
  },
  {
    slug: "recurring-checklist-center",
    title: "Recurring Checklist Center",
    navLabel: "Recurring Checklists",
    icon: ListChecks,
    summary: "Recurring daily, weekly, and monthly manager checklists with due times, required evidence, missed checklist behavior, and escalation rules.",
    owner: "Manager, Admin",
    primaryAction: "Create Checklist",
    secondaryAction: "Record Completion",
    metricLabels: ["Due today", "Missed", "Evidence required", "Escalated"],
    workflows: ["Configure checklist", "Assign owner role", "Complete items", "Escalate missed checklist"],
    fields: ["checklist name", "department", "owner role", "frequency", "due time", "items", "evidence required"],
    statuses: ["Active", "Due", "Complete", "Missed", "Escalated", "Inactive"],
    reports: ["Recurring Checklist Completion Report", "Department Health Report"]
  },
  {
    slug: "approval-queue",
    title: "Approval Queue",
    navLabel: "Approvals",
    icon: BadgeCheck,
    summary: "Central approval queue for onboarding, payroll, pay adjustments, reimbursement, time-off, equipment, purchases, contractor extensions, role changes, transfers, and task completion.",
    owner: "Managers, Directors, Payroll Admins, Global Admins",
    primaryAction: "Review Approval",
    secondaryAction: "Request More Info",
    metricLabels: ["Pending", "Needs more info", "Escalated", "Overdue"],
    workflows: ["No self-approval", "Step routing", "Decision logging", "Global override with reason"],
    fields: ["approval type", "source record", "requester", "approver", "decision", "reason", "audit trail"],
    statuses: ["Pending", "Approved", "Rejected", "Needs More Info", "Escalated", "Cancelled", "Expired"],
    reports: ["Pending Payroll Approval Report", "Escalation Report"]
  },
  {
    slug: "escalation-queue",
    title: "Escalation Queue",
    navLabel: "Escalations",
    icon: AlertTriangle,
    summary: "Escalated blockers and requests that need director or executive attention, with source links, reasons, owner reassignment, and resolution notes.",
    owner: "Director, Global Admin",
    primaryAction: "Resolve Escalation",
    secondaryAction: "Reassign Owner",
    metricLabels: ["Open escalations", "Overdue", "Work stoppage", "Resolved this week"],
    workflows: ["Escalate source item", "Assign director", "Request manager update", "Close with reason"],
    fields: ["source type", "source ID", "department", "reason", "escalated by", "escalated to"],
    statuses: ["Open", "Waiting on Manager", "Waiting on Director", "Resolved", "Cancelled"],
    reports: ["Escalation Report", "Blocked Items Report"]
  },
  {
    slug: "employee-directory",
    title: "Employee Directory",
    navLabel: "Employee Directory",
    icon: Users,
    summary: "Role-restricted employee directory with safe profile summaries, department, manager, shift, location, job title, and lifecycle links.",
    owner: "All authenticated users with scope limits",
    primaryAction: "Find Employee",
    secondaryAction: "Open Lifecycle",
    metricLabels: ["Employees", "Departments", "Contractors", "Onboarding"],
    workflows: ["Search", "Filter by department", "View safe summary", "Open related requests"],
    fields: ["employee ID", "name", "department", "manager", "job title", "shift", "location"],
    statuses: ["Active", "Onboarding", "Contractor", "Archived"],
    reports: ["Company Workforce Readiness Brief", "Employee Lifecycle Report"]
  },
  {
    slug: "department-directory",
    title: "Department Directory",
    navLabel: "Department Directory",
    icon: Building2,
    summary: "Directory of departments, managers, directors, ticket centers, locations, teams, and operational ownership.",
    owner: "Global Admin, Directors",
    primaryAction: "Open Department",
    secondaryAction: "Review Ticket Center",
    metricLabels: ["Departments", "Ticket centers", "Managers", "Locations"],
    workflows: ["Assign manager", "Assign director", "Review queue", "Generate department report"],
    fields: ["department", "code", "manager", "director", "location", "ticket center"],
    statuses: ["Active", "Needs Owner", "Archived"],
    reports: ["Department Health Report", "Department Ticket Backlog Report"]
  },
  {
    slug: "contact-directory",
    title: "Contact Directory",
    navLabel: "Contact Directory",
    icon: HelpCircle,
    summary: "Internal contact directory for department owners, request routes, support contacts, vendors, and escalation contacts.",
    owner: "Admin, Managers",
    primaryAction: "Add Contact",
    secondaryAction: "Update Route",
    metricLabels: ["Contacts", "Departments", "Vendors", "Escalation contacts"],
    workflows: ["Find owner", "Route request", "Update contact", "Archive contact"],
    fields: ["name", "department", "role", "phone", "email", "route type"],
    statuses: ["Active", "Needs Update", "Archived"],
    reports: ["Department Directory Export", "Contact Update Report"]
  },
  {
    slug: "equipment-supplies-request-center",
    title: "Equipment & Supplies Request Center",
    navLabel: "Equipment & Supplies",
    icon: PackageCheck,
    summary: "Requests for equipment, supplies, PPE, tools, workspace readiness, badge/key needs, software coordination, and resource approvals.",
    owner: "Employee, Manager, Purchasing, Facilities",
    primaryAction: "Create Resource Request",
    secondaryAction: "Link Onboarding Case",
    metricLabels: ["Submitted", "Pending approval", "Waiting vendor", "Ready"],
    workflows: ["Submit request", "Manager approval", "Assign owner", "Record handoff"],
    fields: ["request ID", "requested by", "requested for", "department", "priority", "due date", "status"],
    statuses: ["Submitted", "Manager Review", "Waiting Vendor", "Ready", "Complete", "Cancelled"],
    reports: ["Equipment Request Report", "Department Productivity Report"]
  },
  {
    slug: "training-assignment-center",
    title: "Training Assignment Center",
    navLabel: "Training Assignments",
    icon: ClipboardList,
    summary: "Training assignments tied to employees, onboarding cases, departments, due dates, completion notes, and manager follow-up.",
    owner: "Manager, HR",
    primaryAction: "Assign Training",
    secondaryAction: "Review Overdue",
    metricLabels: ["Assigned", "Due soon", "Overdue", "Complete"],
    workflows: ["Assign training", "Track completion", "Link onboarding case", "Notify manager"],
    fields: ["employee", "training", "assigned by", "due date", "completion date", "status"],
    statuses: ["Assigned", "In Progress", "Complete", "Overdue", "Cancelled"],
    reports: ["Training Assignment Report", "First-Week Readiness Report"]
  },
  {
    slug: "policy-document-acknowledgment-center",
    title: "Policy / Document Acknowledgment Center",
    navLabel: "Document Acknowledgments",
    icon: ScrollText,
    summary: "Policy and document assignments with acknowledgment tracking, due dates, allowed uploads, and employee visibility.",
    owner: "HR, Manager, Admin",
    primaryAction: "Assign Document",
    secondaryAction: "Review Acknowledgments",
    metricLabels: ["Assigned", "Acknowledged", "Overdue", "Needs review"],
    workflows: ["Assign policy", "Employee acknowledge", "Track due date", "Export acknowledgment report"],
    fields: ["employee", "policy", "file", "assigned by", "due date", "acknowledged at"],
    statuses: ["Assigned", "Acknowledged", "Overdue", "Cancelled"],
    reports: ["Policy Acknowledgment Report", "Onboarding Readiness Report"]
  },
  {
    slug: "manager-notes-follow-ups",
    title: "Manager Notes & Follow-Ups",
    navLabel: "Manager Notes",
    icon: NotebookPen,
    summary: "Structured manager notes with visibility levels, follow-up dates, linked tasks, linked tickets, onboarding cases, and audit history.",
    owner: "Manager, Director, HR/Admin",
    primaryAction: "Create Note",
    secondaryAction: "Create Follow-Up",
    metricLabels: ["Follow-ups due", "Private notes", "Director visible", "Employee visible"],
    workflows: ["Record one-on-one note", "Add coaching note", "Create follow-up", "Restrict visibility"],
    fields: ["employee", "manager", "note type", "title", "visibility", "follow-up required", "follow-up date"],
    statuses: ["Open", "Follow-Up Due", "Complete", "Archived"],
    reports: ["Manager Follow-Up Report", "Employee Lifecycle Report"]
  },
  {
    slug: "meeting-notes-action-items",
    title: "Meeting Notes & Action Items",
    navLabel: "Meeting Actions",
    icon: FileSpreadsheet,
    summary: "Meeting notes and assigned action items with owners, due dates, linked commitments, departments, and completion tracking.",
    owner: "Managers, Directors",
    primaryAction: "Create Meeting Note",
    secondaryAction: "Assign Action Item",
    metricLabels: ["Open action items", "Overdue", "Completed", "Linked commitments"],
    workflows: ["Capture meeting", "Assign action", "Link task", "Close commitment"],
    fields: ["meeting title", "date", "attendees", "summary", "owner", "due date"],
    statuses: ["Open", "Waiting", "Complete", "Archived"],
    reports: ["Manager Weekly Summary", "Department Productivity Report"]
  },
  {
    slug: "one-on-one-tracker",
    title: "One-on-One Tracker",
    navLabel: "One-on-Ones",
    icon: UserCheck,
    summary: "Manager one-on-one tracking with employee, meeting date, notes, action items, visibility, and lifecycle links.",
    owner: "Manager",
    primaryAction: "Record One-on-One",
    secondaryAction: "Schedule Follow-Up",
    metricLabels: ["Due this week", "Completed", "Action items", "Overdue follow-ups"],
    workflows: ["Record conversation", "Create action item", "Create lifecycle event", "Set follow-up"],
    fields: ["employee", "manager", "meeting date", "summary", "action items", "visibility"],
    statuses: ["Scheduled", "Complete", "Follow-Up Due", "Archived"],
    reports: ["Manager Follow-Up Report", "Employee Lifecycle Report"]
  },
  {
    slug: "department-goals",
    title: "Department Goals",
    navLabel: "Department Goals",
    icon: Activity,
    summary: "Department goals and commitments tied to managers, target dates, progress scores, blockers, and executive reporting.",
    owner: "Manager, Director",
    primaryAction: "Create Goal",
    secondaryAction: "Update Progress",
    metricLabels: ["Active goals", "At risk", "Blocked", "Complete"],
    workflows: ["Set goal", "Track score", "Add blocker", "Report progress"],
    fields: ["department", "owner", "title", "target date", "score", "status"],
    statuses: ["Active", "At Risk", "Blocked", "Complete", "Archived"],
    reports: ["Department Health Report", "Director Oversight Report"]
  },
  {
    slug: "internal-announcements",
    title: "Internal Announcements",
    navLabel: "Announcements",
    icon: Bell,
    summary: "Internal announcements targeted by audience, department, or company-wide scope with publish and expiration tracking.",
    owner: "Managers, Directors, Global Admin",
    primaryAction: "Create Announcement",
    secondaryAction: "Publish",
    metricLabels: ["Drafts", "Published", "Expiring", "Archived"],
    workflows: ["Draft", "Target audience", "Publish", "Archive"],
    fields: ["title", "body", "audience", "department", "published at", "expires at"],
    statuses: ["Draft", "Published", "Expired", "Archived"],
    reports: ["Announcement History", "Workforce Readiness Brief"]
  },
  {
    slug: "reports-exports",
    title: "Reports & Exports",
    navLabel: "Reports & Exports",
    icon: FileArchive,
    summary: "Branded internal reports and exports for operations, tickets, payroll coordination, onboarding, attendance, lifecycle events, blockers, and productivity.",
    owner: "Managers, Directors, Global Admin",
    primaryAction: "Generate Report",
    secondaryAction: "Export",
    metricLabels: ["Generated", "Exports", "Templates", "Scheduled"],
    workflows: ["Select report", "Apply filters", "Generate summary", "Export safe fields"],
    fields: ["report title", "report type", "timestamp", "generated by", "date range", "filters", "report ID"],
    statuses: ["Generated", "Exported", "Archived"],
    reports: ["All Required Management Reports"]
  },
  {
    slug: "admin-settings",
    title: "Admin Settings",
    navLabel: "Settings & Admin",
    icon: Settings,
    summary: "Company profile, departments, locations, shifts, roles, permissions, ticket centers, workflows, approval rules, exports, integrations, and reset protections.",
    owner: "Global Admin / CEO",
    primaryAction: "Update Setting",
    secondaryAction: "Review Audit Log",
    metricLabels: ["Departments", "Roles", "Templates", "Integrations"],
    workflows: ["Manage roles", "Manage templates", "Configure approvals", "Manage safe exports"],
    fields: ["setting key", "value", "department", "owner", "updated by", "audit trail"],
    statuses: ["Active", "Needs Review", "Archived"],
    reports: ["Admin Configuration Export", "Audit Log Report"]
  },
  {
    slug: "audit-log",
    title: "Audit Log",
    navLabel: "Audit Log",
    icon: ShieldCheck,
    summary: "Managerial accountability trail for sensitive actions, approvals, exports, overrides, file uploads, workflow changes, and administrative actions.",
    owner: "Global Admin / CEO",
    primaryAction: "Search Audit Log",
    secondaryAction: "Export Audit History",
    metricLabels: ["Sensitive actions", "Overrides", "Exports", "Failed attempts"],
    workflows: ["Record action", "Filter by entity", "Review override reason", "Export internal history"],
    fields: ["actor", "action", "entity type", "entity ID", "outcome", "reason", "timestamp"],
    statuses: ["SUCCESS", "DENIED", "FAILED"],
    reports: ["Audit Log Report", "Export History Record"]
  },
  {
    slug: "workplace-readiness",
    title: "Workplace Readiness",
    navLabel: "Workplace Readiness",
    icon: HardHat,
    summary: "Readiness view for workspace, equipment, badge/key, uniform/PPE, software coordination, and first-day operational setup.",
    owner: "Manager, Facilities, IT, HR",
    primaryAction: "Create Readiness Task",
    secondaryAction: "Review Blockers",
    metricLabels: ["Ready", "Pending", "Blocked", "Due before start"],
    workflows: ["Assign workspace", "Request badge/key", "Prepare equipment", "Confirm first-day readiness"],
    fields: ["employee", "onboarding case", "workspace", "equipment", "badge/key", "owner", "status"],
    statuses: ["Not Started", "In Progress", "Blocked", "Ready", "Complete"],
    reports: ["First-Day Readiness Report", "Onboarding Readiness Report"]
  },
  {
    slug: "maintenance-operations",
    title: "Maintenance Operations",
    navLabel: "Maintenance Ops",
    icon: Wrench,
    summary: "Maintenance work requests, urgent downtime visibility, preventive checklist coordination, supplies needed, and unresolved blocker escalation.",
    owner: "Maintenance Manager",
    primaryAction: "Create Maintenance Ticket",
    secondaryAction: "Escalate Downtime",
    metricLabels: ["Machine issues", "Facility repairs", "Urgent downtime", "Preventive items"],
    workflows: ["Open maintenance ticket", "Assign owner", "Track downtime", "Close with resolution"],
    fields: ["machine", "area", "priority", "requested by", "owner", "due date", "resolution notes"],
    statuses: ["New", "Assigned", "In Progress", "Blocked", "Resolved", "Closed"],
    reports: ["Maintenance Ticket Backlog", "Open Work Stoppage Report"]
  }
];

export const NAVIGATION = [
  "executive-command-dashboard",
  "department-ticket-centers",
  "onboarding-case-management",
  "employee-directory",
  "attendance-schedule-issue-center",
  "payroll-coordination-center",
  "approval-queue",
  "time-off-request-center",
  "recurring-checklist-center",
  "department-productivity-board",
  "reports-exports",
  "internal-announcements",
  "admin-settings",
  "audit-log"
] as const;

export const REPORT_TYPES = [
  "Executive Operations Summary",
  "Company Workforce Readiness Brief",
  "Department Health Report",
  "Manager Weekly Summary",
  "Director Oversight Report",
  "Department Ticket Backlog Report",
  "Ticket Aging Report",
  "Ticket Resolution Report",
  "Open Work Stoppage Report",
  "Payroll Coordination Summary",
  "Pending Payroll Approval Report",
  "Payroll Period Readiness Report",
  "Time Correction Report",
  "Time-Off Request Report",
  "Attendance Issue Report",
  "Onboarding Readiness Report",
  "First-Day Readiness Report",
  "First-Week Readiness Report",
  "30/60/90-Day Review Report",
  "Contractor Expiration Report",
  "Employee Lifecycle Report",
  "Manager Follow-Up Report",
  "Blocked Items Report",
  "Escalation Report",
  "Recurring Checklist Completion Report",
  "Department Productivity Report",
  "Employee Task Report",
  "Equipment Request Report",
  "Training Assignment Report",
  "Policy Acknowledgment Report"
] as const;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
