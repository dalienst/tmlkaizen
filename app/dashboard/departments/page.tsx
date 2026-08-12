import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  departments,
  locations,
  staff,
  kaizenProjects,
  gmLocations,
  hrLocations,
  groupManagersGroups,
} from "@/db/schema";
import { eq, inArray, count } from "drizzle-orm";
import DepartmentsDashboardClient from "./DepartmentsDashboardClient";

export const metadata = { title: "Departments | Kaizen Tracker" };

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id as string;

  // Determine which departments this user can see
  let allowedDeptIds: string[] | null = null;
  let assignedLocationIds: string[] = [];

  if (role === "DEPT_MANAGER") {
    // Manager sees only their own department
    allowedDeptIds = session.user.departmentId ? [session.user.departmentId] : [];
  } else if (role === "GM") {
    const gmLocs = await db.select({ locationId: gmLocations.locationId }).from(gmLocations).where(eq(gmLocations.gmUserId, userId));
    const locationIds = gmLocs.map((l) => l.locationId);
    assignedLocationIds = locationIds;
    const depts = locationIds.length > 0
      ? await db.select({ id: departments.id }).from(departments).where(inArray(departments.locationId, locationIds))
      : [];
    allowedDeptIds = depts.map((d) => d.id);
  } else if (role === "HR") {
    const hrLocs = await db.select({ locationId: hrLocations.locationId }).from(hrLocations).where(eq(hrLocations.hrUserId, userId));
    const locationIds = hrLocs.map((l) => l.locationId);
    assignedLocationIds = locationIds;
    const depts = locationIds.length > 0
      ? await db.select({ id: departments.id }).from(departments).where(inArray(departments.locationId, locationIds))
      : [];
    allowedDeptIds = depts.map((d) => d.id);
  } else if (role === "GROUP_MANAGER") {
    const mgrGroups = await db.select({ groupId: groupManagersGroups.groupId }).from(groupManagersGroups).where(eq(groupManagersGroups.groupManagerId, userId));
    const groupIds = mgrGroups.map((g) => g.groupId);
    const depts = groupIds.length > 0
      ? await db.select({ id: departments.id, locationId: departments.locationId }).from(departments).where(inArray(departments.groupId, groupIds))
      : [];
    allowedDeptIds = depts.map((d) => d.id);
    assignedLocationIds = depts.map((d) => d.locationId);
  } else if (role === "SYSTEM_ADMIN") {
    const allLocs = await db.select({ id: locations.id }).from(locations);
    assignedLocationIds = allLocs.map((l) => l.id);
  }
  // SYSTEM_ADMIN: null = all

  const allLocations = await db.select().from(locations);

  const allDepts = allowedDeptIds !== null
    ? allowedDeptIds.length > 0
      ? await db.select().from(departments).where(inArray(departments.id, allowedDeptIds))
      : []
    : await db.select().from(departments);

  // Count staff and projects per department
  const staffCounts = allDepts.length > 0
    ? await db.select({ departmentId: staff.departmentId, count: count() }).from(staff).where(inArray(staff.departmentId, allDepts.map((d) => d.id))).groupBy(staff.departmentId)
    : [];
  const projectCounts = allDepts.length > 0
    ? await db.select({ departmentId: kaizenProjects.departmentId, count: count() }).from(kaizenProjects).where(inArray(kaizenProjects.departmentId, allDepts.map((d) => d.id))).groupBy(kaizenProjects.departmentId)
    : [];

  const staffCountMap = Object.fromEntries(staffCounts.map((r) => [r.departmentId, Number(r.count)]));
  const projectCountMap = Object.fromEntries(projectCounts.map((r) => [r.departmentId, Number(r.count)]));

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Departments</h1>
        <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
          {allDepts.length} department{allDepts.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="dashboard-content">
        <DepartmentsDashboardClient
          initialDepartments={allDepts}
          locations={allLocations}
          staffCounts={staffCountMap}
          projectCounts={projectCountMap}
          userRole={role}
          assignedLocationIds={assignedLocationIds}
        />
      </div>
    </div>
  );
}

