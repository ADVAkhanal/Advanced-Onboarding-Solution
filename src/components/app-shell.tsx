import Link from "next/link";
import { Bell, BookOpenCheck, CalendarDays, ExternalLink, FileText, GraduationCap, Images, Inbox, MessageSquareQuote, ShieldAlert, Users } from "lucide-react";
import type { AuthenticatedUser } from "@/lib/auth";
import { BRAND_FOOTER, DISCLAIMER, NAVIGATION, PRODUCT_NAME, WORKFLOW_MODULES } from "@/lib/reference-data";
import { TopbarSearch } from "@/components/topbar-search";

// External companion apps — URLs are env-driven (Railway), with the documented
// placeholders as defaults so the links always render and an admin just points
// them at the real hosts. Open in a new tab; never inherit the app session.
const EXTERNAL_APPS = [
  { key: "crm", label: "Open CRM", url: process.env.CRM_URL || "https://crm.yourdomain.com", Icon: Users },
  { key: "docs", label: "Open Document Portal", url: process.env.DOCS_PORTAL_URL || "https://docs.yourdomain.com", Icon: FileText },
  { key: "photos", label: "Company Photos", url: process.env.PHOTOS_URL || "https://photos.company.com", Icon: Images }
];

export function AppShell({ user, children }: { user: AuthenticatedUser; children: React.ReactNode }) {
  const modulesBySlug = new Map(WORKFLOW_MODULES.map((module) => [module.slug, module]));
  const routeOverrides: Record<string, string> = {
    "executive-command-dashboard": "/dashboard",
    "erp-command-center": "/erp",
    "customers-parts": "/erp/customers",
    "quotes-orders": "/erp/quotes",
    "jobs-work-orders": "/erp/jobs",
    "shop-schedule": "/erp/schedule",
    "inventory-materials": "/erp/inventory",
    "purchasing-receiving": "/erp/purchasing",
    "shipping": "/erp/shipping",
    "quality-ncrs": "/erp/quality",
    "shop-floor-control": "/erp/shop-floor",
    "maintenance-command": "/maintenance",
    "shift-handoff": "/shift-handoff",
    "crm-portal": "/crm",
    "erp-documents": "/erp/documents",
    "department-ticket-centers": "/tickets",
    "onboarding-case-management": "/onboarding",
    "payroll-coordination-center": "/payroll-coordination",
    "time-off-request-center": "/time-off",
    "attendance-schedule-issue-center": "/attendance",
    "manager-task-board": "/tasks",
    "recurring-checklist-center": "/tasks/checklists",
    "department-productivity-board": "/tasks/productivity",
    "approval-queue": "/approvals",
    "reports-exports": "/reports",
    "admin-settings": "/admin/settings",
    "employee-directory": "/admin/users",
    "audit-log": "/admin/audit-log"
  };
  const visibleNavigation = NAVIGATION.filter((slug) => {
    if (["admin-settings", "audit-log", "employee-directory"].includes(slug)) {
      return user.userLevel === "ADMIN";
    }
    if (["erp-command-center", "customers-parts", "quotes-orders", "jobs-work-orders", "shop-schedule", "inventory-materials", "purchasing-receiving", "shipping", "quality-ncrs"].includes(slug)) {
      return user.userLevel !== "USER";
    }
    if (["approval-queue", "reports-exports", "crm-portal"].includes(slug)) {
      return user.userLevel !== "USER";
    }
    return true;
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">{process.env.COMPANY_NAME || "ADVANCED"}</div>
          <div className="brand-sub">Shop Management</div>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {visibleNavigation.map((slug, index) => {
            const item = modulesBySlug.get(slug);
            if (!item) return null;
            const Icon = item.icon;
            const href = routeOverrides[slug] ?? `/workflows/${slug}`;
            return (
              <Link className="nav-item" key={slug} href={href}>
                <span className="nav-left">
                  <Icon size={18} />
                  <span>{item.navLabel}</span>
                </span>
                {slug === "department-ticket-centers" ? <span className="nav-badge">24</span> : null}
                {slug === "approval-queue" ? <span className="nav-badge">7</span> : null}
              </Link>
            );
          })}
          <Link className="nav-item" href="/sop">
            <span className="nav-left">
              <BookOpenCheck size={18} />
              <span>SOP Assistant</span>
            </span>
          </Link>
          {user.userLevel !== "USER" ? (
            <Link className="nav-item" href="/sop/escalations">
              <span className="nav-left">
                <MessageSquareQuote size={18} />
                <span>SOP Escalations</span>
              </span>
            </Link>
          ) : null}
          <Link className="nav-item" href="/training">
            <span className="nav-left">
              <GraduationCap size={18} />
              <span>Training</span>
            </span>
          </Link>
          <Link className="nav-item" href="/data-boundaries">
            <span className="nav-left">
              <ShieldAlert size={18} />
              <span>Data Boundaries</span>
            </span>
          </Link>
          <div className="nav-section-label">External Apps</div>
          {EXTERNAL_APPS.map(({ key, label, url, Icon }) => (
            <a className="nav-item" key={key} href={url} target="_blank" rel="noopener noreferrer">
              <span className="nav-left">
                <Icon size={18} />
                <span>{label}</span>
              </span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          ))}
        </nav>
        <div className="sidebar-card">
          <strong>{process.env.COMPANY_NAME || "Advanced PMC"}</strong>
          <span>Partners in Manufacturing</span>
          <p>{BRAND_FOOTER}</p>
        </div>
        <div className="version">v1.0.0</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="top-title">
            <strong>{PRODUCT_NAME}</strong>
            <span>Internal shop ERP and operations command center</span>
          </div>
          <TopbarSearch />
          <div className="user-chip">
            <Bell size={20} />
            <Inbox size={20} />
            <CalendarDays size={20} />
            <div className="avatar">{user.firstName[0]}{user.lastName[0]}</div>
            <div>
              <strong>{user.firstName} {user.lastName}</strong>
              <div className="metric-note">{user.title ?? user.userLevel.replaceAll("_", " ")}</div>
            </div>
          </div>
        </header>
        <div className="workspace">
          <div className="disclaimer">
            <span className="pill">Internal Use</span>
            <span>{DISCLAIMER}</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
