import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { QuoteIntakeForm } from "./intake-form";

export const dynamic = "force-dynamic";

export default async function NewManufacturingQuotePage() {
  const user = await requirePermission("quote:create");

  const [refs, lookups] = await Promise.all([
    getErpReferenceData(user),
    prisma.cycleTimeLookup.findMany({
      where: {
        organizationId: user.organizationId,
        status: "ACTIVE",
        archivedAt: null
      },
      orderBy: [
        { materialCategory: "asc" },
        { process: "asc" },
        { complexityClass: "asc" },
        { diameterClass: "asc" }
      ]
    })
  ]);

  const customerOptions = refs.customers.map((customer) => ({
    label: customer.name,
    value: customer.id
  }));

  // Serialize Decimal to number for the client component.
  const serializableLookups = lookups.map((lookup) => ({
    id: lookup.id,
    materialCategory: lookup.materialCategory,
    process: lookup.process,
    complexityClass: lookup.complexityClass,
    diameterClass: lookup.diameterClass,
    estimatedSetupHours: Number(lookup.estimatedSetupHours),
    estimatedCycleMinutes: Number(lookup.estimatedCycleMinutes),
    sampleSize: lookup.sampleSize,
    confidenceScore: lookup.confidenceScore ? Number(lookup.confidenceScore) : null
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Sales Operations</p>
          <h1>New Manufacturing Quote</h1>
          <p className="subhead">
            Quote a part from material, process, and complexity buckets. Historical cycle-time
            lookups pre-fill setup and cycle minutes when a match exists.
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/erp/quotes">
            ← Back to quotes
          </Link>
        </div>
      </div>
      <QuoteIntakeForm customers={customerOptions} lookups={serializableLookups} />
    </>
  );
}
