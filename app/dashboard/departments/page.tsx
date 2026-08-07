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
} from "@/db/schema";
import { eq, inArray, count } from "drizzle-orm";
import Link from "next/link";

export const metadata = { title: "Departments | Kaizen Tracker" };

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = Number(session.user.id);

  // Determine which departments this user can see
  let allowedDeptIds: number[] | null = null;

  if (role === "DEPT_MANAGER") {
    // Manager sees only their own department
    allowedDeptIds = session.user.departmentId ? [session.user.departmentId] : [];
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
  }
  // SYSTEM_ADMIN: null = all

  const allLocations = await db.select().from(locations);
  const locMap = Object.fromEntries(allLocations.map((l) => [l.id, l]));

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
        {allDepts.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
            No departments available.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {allDepts.map((dept) => {
              const loc = locMap[dept.locationId];
              const staffCount = staffCountMap[dept.id] ?? 0;
              const projectCount = projectCountMap[dept.id] ?? 0;
              return (
                <Link key={dept.id} href={`/dashboard/departments/${dept.id}`} style={{ textDecoration: "none" }}>
                  <div className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-semibold" style={{ marginBottom: "0.125rem" }}>{dept.name}</div>
                      <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
                        {loc?.name ?? "Unknown location"} · {dept.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div className="font-semibold" style={{ color: "var(--color-brand)" }}>{staffCount}</div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>Staff</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div className="font-semibold" style={{ color: "var(--color-brand)" }}>{projectCount}</div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>Kaizens</div>
                      </div>
                    </div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>→</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
