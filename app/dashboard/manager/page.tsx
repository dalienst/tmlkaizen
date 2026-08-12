import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  kaizenProjects,
  staff,
  departments,
  coreValues,
  managersDepartments,
} from "@/db/schema";
import { eq, desc, inArray, asc } from "drizzle-orm";
import ManagerDashboardClient from "./ManagerDashboardClient";
import Link from "next/link";

export const metadata = { title: "Manager Dashboard | Kaizen Tracker" };

export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const session = await auth();
  if (!session || (session.user.role !== "DEPT_MANAGER" && session.user.role !== "SYSTEM_ADMIN")) {
    redirect("/dashboard");
  }

  const userId = session.user.id as string;
  const resolvedParams = await searchParams;
  const deptParam = resolvedParams.dept;

  // Retrieve managed departments
  let deptIds: string[] = [];

  if (session.user.role === "SYSTEM_ADMIN") {
    const allDepts = await db.select({ id: departments.id }).from(departments);
    deptIds = allDepts.map((d) => d.id);
  } else {
    const managedDepts = await db
      .select({ departmentId: managersDepartments.departmentId })
      .from(managersDepartments)
      .where(eq(managersDepartments.managerUserId, userId));

    deptIds = managedDepts.map((d) => d.departmentId);

    // Backwards compatibility fallback to user.departmentId
    if (deptIds.length === 0 && session.user.departmentId) {
      deptIds = [session.user.departmentId];
    }
  }

  if (deptIds.length === 0) {
    return (
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Projects</h1>
        </div>
        <div className="dashboard-content">
          <div className="alert alert-warning">
            Your account is not assigned to any department. Please contact your system administrator.
          </div>
        </div>
      </div>
    );
  }

  // Selected department resolution
  const selectedDeptId = deptParam && deptIds.includes(deptParam) ? deptParam : deptIds[0];

  const [allManagedDepts, projects, allCoreValues] = await Promise.all([
    db.select().from(departments).where(inArray(departments.id, deptIds)).orderBy(asc(departments.name)),
    db
      .select({
        project: kaizenProjects,
        staffName: staff.name,
        staffId: staff.staffId,
      })
      .from(kaizenProjects)
      .leftJoin(staff, eq(kaizenProjects.staffId, staff.id))
      .where(eq(kaizenProjects.departmentId, selectedDeptId))
      .orderBy(desc(kaizenProjects.createdAt)),
    db.select().from(coreValues),
  ]);

  const selectedDept = allManagedDepts.find((d) => d.id === selectedDeptId);

  // Stats
  const totalCount = projects.length;
  const proposedCount = projects.filter((p) => p.project.status === "PROPOSED").length;
  const inProgressCount = projects.filter((p) => p.project.status === "IN_PROGRESS").length;
  const completedThisMonth = projects.filter((p) => {
    if (p.project.status !== "COMPLETED") return false;
    const d = new Date(p.project.updatedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <div>
          <div className="font-semibold" style={{ fontSize: "1rem" }}>Projects Dashboard</div>
          {selectedDept && (
            <div className="text-sub" style={{ fontSize: "0.8125rem" }}>{selectedDept.name}</div>
          )}
        </div>
        {allManagedDepts.length > 1 && (
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            {allManagedDepts.map((d) => (
              <Link
                key={d.id}
                href={`/dashboard/manager?dept=${d.id}`}
                className={`btn btn-sm ${selectedDeptId === d.id ? "btn-primary" : "btn-secondary"}`}
              >
                {d.name}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="dashboard-content">
        {/* Quick nav cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { href: selectedDeptId ? `/dashboard/departments/${selectedDeptId}` : "/dashboard/departments", label: "Selected Department", desc: selectedDept?.name ?? "View details", icon: "🏢" },
            { href: "/dashboard/staff", label: "Staff", desc: "Department staff roster", icon: "👥" },
            { href: "/dashboard/analytics", label: "Analytics", desc: "Progress & stall detection", icon: "📊" },
          ].map((card) => (
            <Link key={card.href} href={card.href} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                <span style={{ fontSize: "1.25rem" }}>{card.icon}</span>
                <div>
                  <div className="font-semibold" style={{ fontSize: "0.875rem" }}>{card.label}</div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>{card.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <ManagerDashboardClient
          projects={projects.map((p) => ({
            ...p.project,
            staffName: p.staffName ?? "Unknown",
            staffId: p.staffId ?? "",
          }))}
          coreValues={allCoreValues}
          stats={{ totalCount, proposedCount, inProgressCount, completedThisMonth }}
        />
      </div>
    </div>
  );
}
