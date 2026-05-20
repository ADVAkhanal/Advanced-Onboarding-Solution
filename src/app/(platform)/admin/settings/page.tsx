import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { pushoverStatus } from "@/lib/pushover";
import { prisma } from "@/lib/prisma";
import { DISCLAIMER, ENCLAVE_COMPATIBLE_STATEMENT, PRODUCT_NAME, TAGLINE } from "@/lib/reference-data";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requirePermission("admin:manage");
  const [settings, appSettings, notificationLogs] = await Promise.all([
    prisma.setting.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { key: "asc" }, take: 100 }),
    prisma.appSetting.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { key: "asc" }, take: 100 }),
    prisma.notificationLog.count({ where: { organizationId: user.organizationId, archivedAt: null } })
  ]);
  const pushover = pushoverStatus();

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin · Settings</p>
          <h1>Company, notifications, exports, and data boundaries</h1>
          <p className="subhead">Operational configuration is intentionally small for the MVP: company identity, safe exports, departments, roles, notification status, and boundary language.</p>
        </div>
        <Link className="button" href="/data-boundaries">Data Boundaries</Link>
      </div>

      <div className="grid two-col">
        <section className="card">
          <div className="section-title"><h2>Company Profile</h2><span className="pill green">Configured by environment</span></div>
          <div className="card-pad">
            <ul className="compact-list">
              <li><span>App name</span><strong>{PRODUCT_NAME}</strong></li>
              <li><span>Company</span><strong>{process.env.COMPANY_NAME || "Not set"}</strong></li>
              <li><span>Tagline</span><strong>{TAGLINE}</strong></li>
              <li><span>Public base URL</span><strong>{process.env.PUBLIC_BASE_URL || "Not set"}</strong></li>
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="section-title"><h2>Notification Settings</h2><span className={pushover.enabled ? "pill green" : "pill amber"}>{pushover.enabled ? "Pushover enabled" : "Pushover optional"}</span></div>
          <div className="card-pad">
            <ul className="compact-list">
              <li><span>Recipient count</span><strong>{pushover.recipientCount}</strong></li>
              <li><span>Notification logs</span><strong>{notificationLogs}</strong></li>
              <li><span>Urgent ticket alerts</span><strong>{pushover.enabled ? "On" : "Off"}</strong></li>
              <li><span>Approval/payroll alerts</span><strong>{pushover.enabled ? "On" : "Off"}</strong></li>
            </ul>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>Data Boundary Statements</h2><span className="pill red">Required in production</span></div>
        <div className="card-pad">
          <p className="subhead">{DISCLAIMER}</p>
          <p className="subhead">{ENCLAVE_COMPATIBLE_STATEMENT}</p>
        </div>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>Runtime Settings</h2><span className="pill">{settings.length + appSettings.length}</span></div>
        <div className="card-pad">
          {[...settings, ...appSettings].length ? (
            <ul className="compact-list">
              {[...settings, ...appSettings].map((setting) => (
                <li key={`${setting.key}-${setting.id}`}><span>{setting.key}</span><strong>{setting.status}</strong></li>
              ))}
            </ul>
          ) : (
            <div className="empty">No runtime settings are stored yet. Reference settings are added by the seed.</div>
          )}
        </div>
      </section>
    </>
  );
}
