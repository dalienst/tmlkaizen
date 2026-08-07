import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { kaizenProjects, staff, departments, coreValues } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import ManagerDashboardClient from "./ManagerDashboardClient";
import Link from "next/link";

export const metadata = { title: "Manager Dashboard | Kaizen Tracker" };

export default async function ManagerPage() {
  const session = await auth();
  if (!session || (session.user.role !== "DEPT_MANAGER" && session.user.role !== "SYSTEM_ADMIN")) {
    redirect("/dashboard");
  }

  const deptId = session.user.departmentId;
  if (!deptId) {
    return (
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Projects</h1>
        </div>
        <div className="dashboard-content">
          <div className="alert alert-warning">
            Your account is not assigned to a department. Please contact your system administrator.
          </div>
        </div>
      </div>
    );
  }

  const [projects, dept, allCoreValues] = await Promise.all([
    db
      .select({
        project: kaizenProjects,
        staffName: staff.name,
        staffId: staff.staffId,
      })
      .from(kaizenProjects)
      .leftJoin(staff, eq(kaizenProjects.staffId, staff.id))
      .where(eq(kaizenProjects.departmentId, deptId))
      .orderBy(desc(kaizenProjects.createdAt)),
    db.query.departments.findFirst({ where: eq(departments.id, deptId) }),
    db.select().from(coreValues),
  ]);

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
          <div className="font-semibold" style={{ fontSize: "1rem" }}>Projects</div>
          {dept && (
            <div className="text-sub" style={{ fontSize: "0.8125rem" }}>{dept.name}</div>
          )}
        </div>
      </div>
      <div className="dashboard-content">
        {/* Quick nav cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { href: deptId ? `/dashboard/departments/${deptId}` : "/dashboard/departments", label: "My Department", desc: dept?.name ?? "View details", icon: "🏢" },
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
