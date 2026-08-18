import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { locations, departments, staff, kaizenProjects } from "@/db/schema";
import { asc, count } from "drizzle-orm";
import LocationsDashboardClient from "./LocationsDashboardClient";

export const metadata = { title: "Locations | Kaizen Tracker" };

export default async function LocationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Only allow SYSTEM_ADMIN to access
  if (session.user.role !== "SYSTEM_ADMIN") {
    redirect("/dashboard");
  }

  // Load all locations
  const allLocations = await db.select().from(locations).orderBy(asc(locations.name));

  // Load all departments
  const allDepts = await db.select().from(departments);

  // Count departments per location
  const deptCounts = allDepts.reduce((acc, d) => {
    acc[d.locationId] = (acc[d.locationId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count staff per department
  const allStaff = await db.select({ id: staff.id, departmentId: staff.departmentId, isActive: staff.isActive }).from(staff);
  
  // Count projects per department
  const allProjects = await db.select({ id: kaizenProjects.id, departmentId: kaizenProjects.departmentId }).from(kaizenProjects);

  // Map department to its locationId
  const deptLocationMap = Object.fromEntries(allDepts.map((d) => [d.id, d.locationId]));

  // Count staff per location
  const staffCounts = allStaff.reduce((acc, s) => {
    if (s.isActive) {
      const locId = deptLocationMap[s.departmentId];
      if (locId) {
        acc[locId] = (acc[locId] || 0) + 1;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  // Count projects per location
  const projectCounts = allProjects.reduce((acc, p) => {
    const locId = deptLocationMap[p.departmentId];
    if (locId) {
      acc[locId] = (acc[locId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <div>
          <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Locations Directory</h1>
          <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
            {allLocations.length} active and inactive physical branch hubs
          </div>
        </div>
      </div>
      <div className="dashboard-content">
        <LocationsDashboardClient
          locations={allLocations}
          deptCounts={deptCounts}
          staffCounts={staffCounts}
          projectCounts={projectCounts}
        />
      </div>
    </div>
  );
}
