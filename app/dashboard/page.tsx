import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROLE_DASHBOARD } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  const destination = ROLE_DASHBOARD[role];
  redirect(destination ?? "/login");
}
