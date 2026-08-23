import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  kaizenProjects,
  departments,
  locations,
  staff,
  coreValues,
  gmLocations,
  hrLocations,
  groupManagersGroups,
  managersDepartments,
} from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import AnalyticsClient from "./AnalyticsClient";

export const metadata = { title: "Analytics | Kaizen Tracker" };

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id as string;

  let allowedDeptIds: string[] | null = null;

  if (role === "DEPT_MANAGER") {
    const managedDepts = await db
      .select({ departmentId: managersDepartments.departmentId })
      .from(managersDepartments)
      .where(eq(managersDepartments.managerUserId, userId));
    let deptIds = managedDepts.map((d) => d.departmentId);
    if (deptIds.length === 0 && session.user.departmentId) {
      deptIds = [session.user.departmentId];
    }
    allowedDeptIds = deptIds;
  } else if (role === "GM") {
    const gmLocs = await db.select({ locationId: gmLocations.locationId }).from(gmLocations).where(eq(gmLocations.gmUserId, userId));
    const locationIds = gmLocs.map((l) => l.locationId);
    const depts = locationIds.length > 0
      ? await db.select({ id: departments.id }).from(departments).where(inArray(departments.locationId, locationIds))
      : [];
    allowedDeptIds = depts.map((d) => d.id);
  } else if (role === "HR") {
    const hrLocs = await db.select({ locationId: hrLocations.locationId }).from(hrLocations).where(eq(hrLocations.hrUserId, userId));
    const locationIds = hrLocs.map((l) => l.locationId);
    const depts = locationIds.length > 0
      ? await db.select({ id: departments.id }).from(departments).where(inArray(departments.locationId, locationIds))
      : [];
    allowedDeptIds = depts.map((d) => d.id);
  } else if (role === "GROUP_MANAGER") {
    const mgrGroups = await db.select({ groupId: groupManagersGroups.groupId }).from(groupManagersGroups).where(eq(groupManagersGroups.groupManagerId, userId));
    const groupIds = mgrGroups.map((g) => g.groupId);
    const depts = groupIds.length > 0
      ? await db.select({ id: departments.id }).from(departments).where(inArray(departments.groupId, groupIds))
      : [];
    allowedDeptIds = depts.map((d) => d.id);
  }

  const allDepts = await db.select().from(departments);
  const allLocations = await db.select().from(locations);
  const allCoreValues = await db.select().from(coreValues);

  const rawProjects = allowedDeptIds !== null
    ? allowedDeptIds.length > 0
      ? await db.select({
          project: kaizenProjects,
          staffName: staff.name,
          staffDbId: staff.id,
          staffId: staff.staffId,
          deptName: departments.name,
        })
          .from(kaizenProjects)
          .leftJoin(staff, eq(kaizenProjects.staffId, staff.id))
          .leftJoin(departments, eq(kaizenProjects.departmentId, departments.id))
          .where(inArray(kaizenProjects.departmentId, allowedDeptIds))
          .orderBy(desc(kaizenProjects.createdAt))
      : []
    : await db.select({
        project: kaizenProjects,
        staffName: staff.name,
        staffDbId: staff.id,
        staffId: staff.staffId,
        deptName: departments.name,
      })
        .from(kaizenProjects)
        .leftJoin(staff, eq(kaizenProjects.staffId, staff.id))
        .leftJoin(departments, eq(kaizenProjects.departmentId, departments.id))
        .orderBy(desc(kaizenProjects.createdAt));

  // Normalize project type structures to prevent JSON serialization mismatches
  const projects = rawProjects.map((p) => ({
    project: {
      ...p.project,
      // Ensure date types are correctly serialized if returned from Server Action or Drizzle
      createdAt: new Date(p.project.createdAt),
      updatedAt: new Date(p.project.updatedAt),
      startDate: p.project.startDate ? new Date(p.project.startDate) : null,
      endDate: p.project.endDate ? new Date(p.project.endDate) : null,
    },
    staffName: p.staffName,
    staffDbId: p.staffDbId,
    staffId: p.staffId,
    deptName: p.deptName,
  }));

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Analytics</h1>
      </div>
      <div className="dashboard-content">
        <AnalyticsClient
          projects={projects}
          departments={allDepts}
          locations={allLocations}
          coreValues={allCoreValues}
        />
      </div>
    </div>
  );
}
