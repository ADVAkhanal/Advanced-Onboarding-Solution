import Link from "next/link";
import { Bell, CalendarDays, Inbox, Search } from "lucide-react";
import type { AuthenticatedUser } from "@/lib/auth";
import { BRAND_FOOTER, DISCLAIMER, NAVIGATION, PRODUCT_NAME, WORKFLOW_MODULES } from "@/lib/reference-data";

export function AppShell({ user, children }: { user: AuthenticatedUser; children: React.ReactNode }) {
  const modulesBySlug = new Map(WORKFLOW_MODULES.map((module) => [module.slug, module]));
  const routeOverrides: Record<string, string> = {
    "executive-command-dashboard": "/",
    "department-ticket-centers": "/tickets",
    "onboarding-case-management": "/onboarding",
    "payroll-coordination-center": "/payroll",
    "reports-exports": "/reports"
    // Module routes (capacity-mps, first-piece-runs, scheduling, npi-projects, sales)
    // resolve through the /workflows/[slug] catch-all until their dedicated routes land in Phase 3.
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">ADVANCED</div>
          <div className="brand-sub">Shop Management & Onboarding Command Center</div>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {NAVIGATION.map((slug, index) => {
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
                {index === 1 ? <span className="nav-badge">24</span> : null}
                {slug === "approval-queue" ? <span className="nav-badge">7</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-card">
          <strong>ADVANCED</strong>
          <span>Consulting Inc.</span>
          <p>{BRAND_FOOTER}</p>
        </div>
        <div className="version">v1.0.0</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="top-title">
            <strong>{PRODUCT_NAME}</strong>
            <span>Internal operations command center</span>
          </div>
          <div className="search">
            <Search size={18} />
            <input aria-label="Search" placeholder="Search employees, tickets, departments, requests..." />
          </div>
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
