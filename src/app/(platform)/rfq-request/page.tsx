import { requirePermission } from "@/lib/auth";
import { IntakeFormSection } from "@/components/intake-form-section";

export const dynamic = "force-dynamic";

export default async function RfqRequestPage() {
  await requirePermission("crm:manage");
  return <IntakeFormSection type="rfq" />;
}
