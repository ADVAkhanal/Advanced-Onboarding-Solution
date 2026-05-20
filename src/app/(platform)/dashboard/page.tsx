import { requireUser } from "@/lib/auth";
import { getCommandCenterData } from "@/lib/dashboard";
import { DashboardView } from "@/components/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getCommandCenterData(user);
  const variant = user.userLevel === "USER" ? "employee" : user.userLevel === "MANAGER" ? "manager" : user.userLevel === "DIRECTOR" ? "director" : "executive";

  return <DashboardView data={data} user={user} variant={variant} />;
}
