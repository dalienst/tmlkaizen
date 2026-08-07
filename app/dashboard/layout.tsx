import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardShellClient } from "@/components/dashboard/DashboardShellClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <DashboardShellClient sidebar={<Sidebar />}>
      {children}
    </DashboardShellClient>
  );
}
