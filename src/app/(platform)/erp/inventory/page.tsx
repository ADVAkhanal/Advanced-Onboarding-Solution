import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { decimalText, getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await requirePermission("erp:view");
  if (user.userLevel === "USER") redirect("/erp/shop-floor");
  const refs = await getErpReferenceData(user);
  const inventory = await prisma.inventoryItem.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: [{ locationCode: "asc" }, { itemNumber: "asc" }], take: 150 });

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Materials</p><h1>Inventory & Materials</h1><p className="subhead">Fast material visibility for stock, allocation, reorder signals, locations, and job support. No payment or regulated data.</p></div></div>
      <div className="grid two-col">
        <ErpCreateForm title="Add Inventory Item" endpoint="/api/erp/inventory" fields={[
          { name: "itemNumber", label: "Item Number", required: true },
          { name: "partId", label: "Linked Part", type: "select", options: refs.parts.map((part) => ({ label: `${part.partNumber} Rev ${part.revision}`, value: part.id })) },
          { name: "description", label: "Description", required: true },
          { name: "itemType", label: "Item Type", defaultValue: "MATERIAL" },
          { name: "unitOfMeasure", label: "Unit", defaultValue: "EA" },
          { name: "quantityOnHand", label: "On Hand", type: "number", defaultValue: 0 },
          { name: "quantityAllocated", label: "Allocated", type: "number", defaultValue: 0 },
          { name: "reorderPoint", label: "Reorder Point", type: "number" },
          { name: "locationCode", label: "Location" }
        ]} />
        <section className="card"><div className="section-title"><h2>Inventory Signals</h2><span className="pill">{inventory.length}</span></div><div className="card-pad"><ul className="compact-list"><li><span>Total item records</span><strong>{inventory.length}</strong></li><li><span>Low stock flags</span><strong>{inventory.filter((item) => item.status === "LOW_STOCK").length}</strong></li><li><span>Allocated items</span><strong>{inventory.filter((item) => Number(item.quantityAllocated) > 0).length}</strong></li></ul></div></section>
      </div>
      <section className="card" style={{ marginTop: 14 }}><div className="section-title"><h2>Inventory Items</h2><span className="pill">{inventory.length}</span></div>{inventory.length ? <table className="table"><thead><tr><th>Item</th><th>Description</th><th>On Hand</th><th>Allocated</th><th>Location</th><th>Status</th></tr></thead><tbody>{inventory.map((item) => <tr key={item.id}><td>{item.itemNumber}</td><td>{item.description}</td><td>{decimalText(item.quantityOnHand)}</td><td>{decimalText(item.quantityAllocated)}</td><td>{item.locationCode ?? "Not set"}</td><td>{item.status}</td></tr>)}</tbody></table> : <div className="empty">No inventory records yet.</div>}</section>
    </>
  );
}
