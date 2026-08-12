import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  staff,
  departments,
  locations,
  gmLocations,
  hrLocations,
  groupManagersGroups,
  kaizenProjects,
  managersDepartments,
} from "@/db/schema";
import { eq, inArray, count } from "drizzle-orm";
import Link from "next/link";
import { formatDate } from "@/lib/constants";
import HRDashboardClient from "../hr/HRDashboardClient";

export const metadata = { title: "Staff | Kaizen Tracker" };

export default async function StaffPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id as string;

  // Determine which department IDs this user can see
  let allowedDeptIds: string[] | null = null; // null = all

  if (role === "DEPT_MANAGER") {
    const managedDepts = await db
      .select({ departmentId: managersDepartments.departmentId })
      .from(managersDepartments)
      .where(eq(managersDepartments.managerUserId, userId));
    let deptIds = managedDepts.map((d) => d.departmentId);
    if (deptIds.length === 0 && session.user.departmentId) {
      deptIds = [session.user.departmentId];
    }
    if (deptIds.length === 0) {
      return (
        <div className="dashboard-main">
          <div className="dashboard-header"><h1 className="font-semibold" style={{ fontSize: "1rem" }}>Department Staff</h1></div>
          <div className="dashboard-content">
            <div className="alert alert-warning">You are not assigned to any department.</div>
          </div>
        </div>
      );
    }
    allowedDeptIds = deptIds;
  } else if (role === "GM") {
    const gmLocs = await db.select({ locationId: gmLocations.locationId }).from(gmLocations).where(eq(gmLocations.gmUserId, userId));
    const locationIds = gmLocs.map((l) => l.locationId);
    if (locationIds.length === 0) {
      return (
        <div className="dashboard-main">
          <div className="dashboard-header"><h1 className="font-semibold" style={{ fontSize: "1rem" }}>Staff</h1></div>
          <div className="dashboard-content">
            <div className="alert alert-warning">Your account is not assigned to any location.</div>
          </div>
        </div>
      );
    }
    const depts = await db.select({ id: departments.id }).from(departments).where(inArray(departments.locationId, locationIds));
    allowedDeptIds = depts.map((d) => d.id);
  } else if (role === "HR") {
    const hrLocs = await db.select({ locationId: hrLocations.locationId }).from(hrLocations).where(eq(hrLocations.hrUserId, userId));
    const locationIds = hrLocs.map((l) => l.locationId);
    if (locationIds.length === 0) {
      return (
        <div className="dashboard-main">
          <div className="dashboard-header"><h1 className="font-semibold" style={{ fontSize: "1rem" }}>Staff</h1></div>
          <div className="dashboard-content">
            <div className="alert alert-warning">Your account is not assigned to any location.</div>
          </div>
        </div>
      );
    }
    const depts = await db.select({ id: departments.id }).from(departments).where(inArray(departments.locationId, locationIds));
    allowedDeptIds = depts.map((d) => d.id);
  } else if (role === "GROUP_MANAGER") {
    const mgrGroups = await db.select({ groupId: groupManagersGroups.groupId }).from(groupManagersGroups).where(eq(groupManagersGroups.groupManagerId, userId));
    const groupIds = mgrGroups.map((g) => g.groupId);
    if (groupIds.length === 0) {
      return (
        <div className="dashboard-main">
          <div className="dashboard-header"><h1 className="font-semibold" style={{ fontSize: "1rem" }}>Staff</h1></div>
          <div className="dashboard-content">
            <div className="alert alert-warning">Your account is not assigned to any group.</div>
          </div>
        </div>
      );
    }
    const depts = await db.select({ id: departments.id }).from(departments).where(inArray(departments.groupId, groupIds));
    allowedDeptIds = depts.map((d) => d.id);
  }
  // SYSTEM_ADMIN: allowedDeptIds stays null = show all

  const allDepts = await db.select().from(departments);
  const allLocations = await db.select().from(locations);
  const deptMap = Object.fromEntries(allDepts.map((d) => [d.id, d]));
  const locMap = Object.fromEntries(allLocations.map((l) => [l.id, l]));

  // Load staff, filtered by department scope
  const staffQuery = allowedDeptIds !== null && allowedDeptIds.length > 0
    ? await db.select().from(staff).where(inArray(staff.departmentId, allowedDeptIds))
    : allowedDeptIds === null
      ? await db.select().from(staff)
      : [];

  // Count projects per staff member
  const projectCounts = staffQuery.length > 0
    ? await db
        .select({ staffId: kaizenProjects.staffId, count: count() })
        .from(kaizenProjects)
        .where(inArray(kaizenProjects.staffId, staffQuery.map((s) => s.id)))
        .groupBy(kaizenProjects.staffId)
    : [];
  const countMap = Object.fromEntries(projectCounts.map((r) => [r.staffId, Number(r.count)]));

  if (role === "SYSTEM_ADMIN") {
    return (
      <div className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <div className="font-semibold" style={{ fontSize: "1rem" }}>Staff Directory</div>
            <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
              {staffQuery.length} member{staffQuery.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="dashboard-content">
          <HRDashboardClient
            staff={staffQuery}
            departments={allDepts}
            locations={allLocations}
          />
        </div>
      </div>
    );
  }

  const title = role === "DEPT_MANAGER" ? "Department Staff" : "Staff";

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1 className="font-semibold" style={{ fontSize: "1rem" }}>{title}</h1>
        <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
          {staffQuery.length} member{staffQuery.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="dashboard-content">
        {staffQuery.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
            No staff members found.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Submissions</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffQuery.map((s) => {
                  const dept = deptMap[s.departmentId];
                  const loc = dept ? locMap[dept.locationId] : null;
                  return (
                    <tr key={s.id}>
                      <td><code style={{ fontSize: "0.8125rem" }}>{s.staffId}</code></td>
                      <td className="font-medium">{s.name}</td>
                      <td className="text-sub">{s.email}</td>
                      <td className="text-sub">{dept?.name ?? "—"}</td>
                      <td className="text-sub">{loc?.name ?? "—"}</td>
                      <td>
                        <span className="badge badge-brand">{countMap[s.id] ?? 0}</span>
                      </td>
                      <td className="text-sub">{formatDate(s.createdAt)}</td>
                      <td>
                        <Link href={`/dashboard/staff/${s.id}`} className="btn btn-ghost btn-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
