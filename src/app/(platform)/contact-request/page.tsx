import { requirePermission } from "@/lib/auth";
import { IntakeFormSection } from "@/components/intake-form-section";

export const dynamic = "force-dynamic";

export default async function ContactRequestPage() {
  await requirePermission("crm:manage");
  return <IntakeFormSection type="contact" />;
}
