import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { kaizenProjects, staff, departments, coreValues } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import ManagerDashboardClient from "./ManagerDashboardClient";

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
