import { requireUser } from "@/lib/auth";
import { getCommandCenterData } from "@/lib/dashboard";
import { DashboardView } from "@/components/dashboard-view";

export const dynamic = "force-dynamic";

export default async function ManagerDashboardPage() {
  const user = await requireUser();
  const data = await getCommandCenterData(user);
  return <DashboardView data={data} user={user} variant="manager" />;
}
