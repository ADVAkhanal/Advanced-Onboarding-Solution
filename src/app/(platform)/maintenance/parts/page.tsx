import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";
import { MaintenanceSubnav } from "../maintenance-subnav";
import { PartAdjustForm } from "./part-adjust-form";

export const dynamic = "force-dynamic";

const CRITICAL_OPTIONS = [
  { label: "No", value: "false" },
  { label: "Yes — critical (shop-stopping)", value: "true" }
];

export default async function MaintenancePartsPage() {
  const user = await requirePermission("maintenance:view");
  const canManage = user.permissions.includes("maintenance:manage");

  const parts = await prisma.maintenancePart.findMany({
    where: { organizationId: user.organizationId, archivedAt: null },
    orderBy: [{ category: "asc" }, { subCategory: "asc" }, { name: "asc" }],
    take: 2000
  });

  const low = parts.filter((p) => p.quantityOnHand <= p.reorderPoint).length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Maintenance · MRO</p>
          <h1>MRO Parts &amp; Supplies</h1>
          <p className="subhead">{parts.length} items · {low} at or below reorder point. Maintenance, repair &amp; operating consumables — not production inventory.</p>
        </div>
      </div>

      <MaintenanceSubnav active="parts" />

      {canManage ? (
        <div style={{ marginBottom: 14 }}>
          <ErpCreateForm
            title="Add MRO item"
            endpoint="/api/maintenance/parts"
            fields={[
              { name: "name", label: "Item name", required: true },
              { name: "category", label: "Category" },
              { name: "subCategory", label: "Subcategory" },
              { name: "unit", label: "Unit", defaultValue: "each" },
              { name: "quantityOnHand", label: "On hand", type: "number", defaultValue: 0 },
              { name: "reorderPoint", label: "Reorder point", type: "number", defaultValue: 0 },
              { name: "critical", label: "Critical", type: "select", options: CRITICAL_OPTIONS, defaultValue: "false" },
              { name: "location", label: "Location" },
              { name: "vendor", label: "Vendor" }
            ]}
          />
        </div>
      ) : null}

      <section className="card">
        <div className="section-title">
          <h2>Inventory</h2>
          <span className="pill">{parts.length}</span>
        </div>
        {parts.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>On hand</th>
                <th style={{ textAlign: "right" }}>Reorder</th>
                <th>Unit</th>
                <th>Status</th>
                {canManage ? <th style={{ textAlign: "center" }}>Adjust</th> : null}
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => {
                const isLow = p.quantityOnHand <= p.reorderPoint;
                const crit = isLow && p.critical;
                return (
                  <tr key={p.id}>
                    <td>{p.name}{p.critical ? <span className="pill red" style={{ marginLeft: 6 }}>CRIT</span> : null}</td>
                    <td>{p.subCategory ?? p.category ?? "—"}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: isLow ? "var(--red)" : undefined }}>{p.quantityOnHand}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.reorderPoint}</td>
                    <td>{p.unit}</td>
                    <td>
                      <span className={`pill ${crit ? "red" : isLow ? "amber" : "green"}`}>{crit ? "CRITICAL" : isLow ? "LOW" : "OK"}</span>
                    </td>
                    {canManage ? (
                      <td style={{ textAlign: "center" }}>
                        <PartAdjustForm id={p.id} />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty">No MRO items yet. Load the baseline from the Overview tab, or add items above.</div>
        )}
      </section>
    </>
  );
}
