import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const metadata = { title: "Settings | Kaizen Tracker" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Settings</h1>
      </div>
      <div className="dashboard-content">
        <SettingsClient user={{ name: session.user.name ?? "", email: session.user.email ?? "" }} />
      </div>
    </div>
  );
}
