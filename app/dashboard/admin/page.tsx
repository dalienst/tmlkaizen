import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { locations, departments, users, coreValues } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import AdminTabs from "./AdminTabs";

export const metadata = {
  title: "Admin Dashboard | Kaizen Tracker",
};

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "SYSTEM_ADMIN") redirect("/dashboard");

  const [allLocations, allDepartments, allUsers, allCoreValues] =
    await Promise.all([
      db.select().from(locations).orderBy(asc(locations.name)),
      db.select().from(departments).orderBy(asc(departments.name)),
      db.select().from(users).orderBy(desc(users.createdAt)),
      db.select().from(coreValues).orderBy(asc(coreValues.sortOrder)),
    ]);

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1 className="font-semibold" style={{ fontSize: "1rem" }}>
          System Administration
        </h1>
      </div>
      <div className="dashboard-content">
        <AdminTabs
          locations={allLocations}
          departments={allDepartments}
          users={allUsers}
          coreValues={allCoreValues}
        />
      </div>
    </div>
  );
}
