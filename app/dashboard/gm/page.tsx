import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { kaizenProjects, departments, staff, coreValues } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/constants";

export const metadata = { title: "GM Dashboard | Kaizen Tracker" };

export default async function GMPage() {
  const session = await auth();
  if (!session || (session.user.role !== "GM" && session.user.role !== "SYSTEM_ADMIN")) {
    redirect("/dashboard");
  }

  const locationId = session.user.locationId;
  if (!locationId) {
    return (
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h1 className="font-semibold" style={{ fontSize: "1rem" }}>GM Overview</h1>
        </div>
        <div className="dashboard-content">
          <div className="alert alert-warning">
            Your account is not assigned to a location. Please contact your system administrator.
          </div>
        </div>
      </div>
    );
  }

  // Get departments for this location
  const locationDepts = await db
    .select()
    .from(departments)
    .where(eq(departments.locationId, locationId));

  const deptIds = locationDepts.map((d) => d.id);

  const [projects, allCoreValues] = await Promise.all([
    deptIds.length > 0
      ? db
          .select({
            project: kaizenProjects,
            staffName: staff.name,
            staffId: staff.staffId,
            deptName: departments.name,
          })
          .from(kaizenProjects)
          .leftJoin(staff, eq(kaizenProjects.staffId, staff.id))
          .leftJoin(departments, eq(kaizenProjects.departmentId, departments.id))
          .where(inArray(kaizenProjects.departmentId, deptIds))
          .orderBy(desc(kaizenProjects.createdAt))
      : Promise.resolve([]),
    db.select().from(coreValues),
  ]);

  const cvMap = Object.fromEntries(allCoreValues.map((cv) => [cv.id, cv.name]));

  // Stats
  const totalCount = projects.length;
  const proposedCount = projects.filter((p) => p.project.status === "PROPOSED").length;
  const inProgressCount = projects.filter((p) => p.project.status === "IN_PROGRESS").length;
  const completedCount = projects.filter((p) => p.project.status === "COMPLETED").length;
  const completionRate =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Per-department breakdown
  const deptBreakdown = locationDepts.map((d) => {
    const deptProjects = projects.filter((p) => p.project.departmentId === d.id);
    return {
      name: d.name,
      total: deptProjects.length,
      proposed: deptProjects.filter((p) => p.project.status === "PROPOSED").length,
      inProgress: deptProjects.filter((p) => p.project.status === "IN_PROGRESS").length,
      completed: deptProjects.filter((p) => p.project.status === "COMPLETED").length,
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Location Overview</h1>
      </div>
      <div className="dashboard-content">

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total submissions" value={totalCount} />
          <StatCard label="Open (Proposed + In Progress)" value={proposedCount + inProgressCount} accentColor="var(--color-inprogress)" />
          <StatCard label="Completed" value={completedCount} accentColor="var(--color-completed)" />
          <StatCard label="Completion rate" value={`${completionRate}%`} accentColor={completionRate >= 50 ? "var(--color-completed)" : "var(--color-inprogress)"} />
        </div>

        {/* Department breakdown */}
        {deptBreakdown.length > 0 && (
          <div className="card p-5 mb-6">
            <div className="font-semibold mb-4" style={{ fontSize: "0.9375rem" }}>
              Submissions by Department
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {deptBreakdown.map((dept) => (
                <div key={dept.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium" style={{ fontSize: "0.875rem" }}>{dept.name}</span>
                    <span className="text-sub" style={{ fontSize: "0.8125rem" }}>{dept.total} total</span>
                  </div>
                  <div style={{ display: "flex", height: "0.5rem", borderRadius: "var(--radius)", overflow: "hidden", background: "var(--color-muted)" }}>
                    {dept.total > 0 && (
                      <>
                        <div style={{ width: `${(dept.completed / dept.total) * 100}%`, background: "var(--color-completed)", transition: "width 300ms ease" }} title={`Completed: ${dept.completed}`} />
                        <div style={{ width: `${(dept.inProgress / dept.total) * 100}%`, background: "var(--color-inprogress)", transition: "width 300ms ease" }} title={`In Progress: ${dept.inProgress}`} />
                        <div style={{ width: `${(dept.proposed / dept.total) * 100}%`, background: "var(--color-proposed)", opacity: 0.4 }} title={`Proposed: ${dept.proposed}`} />
                      </>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    <span>✓ {dept.completed} done</span>
                    <span>◎ {dept.inProgress} in progress</span>
                    <span>○ {dept.proposed} proposed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project table */}
        <div className="card overflow-hidden">
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)" }}>
            <span className="font-semibold" style={{ fontSize: "0.9375rem" }}>All Projects</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Department</th>
                <th>Submitted by</th>
                <th>Core values</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                    No submissions yet across this location.
                  </td>
                </tr>
              )}
              {projects.map(({ project: p, staffName, staffId, deptName }) => (
                <tr key={p.id}>
                  <td>
                    <code style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-brand)" }}>
                      {p.referenceNumber}
                    </code>
                  </td>
                  <td className="text-sub">{deptName ?? "—"}</td>
                  <td>
                    <div className="font-medium">{staffName ?? "—"}</div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>{staffId ?? ""}</div>
                  </td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {p.coreValueIds.slice(0, 2).map((id) => (
                        <Badge key={id} variant="brand">{cvMap[id] ?? id}</Badge>
                      ))}
                      {p.coreValueIds.length > 2 && (
                        <Badge variant="neutral">+{p.coreValueIds.length - 2}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="text-sub" style={{ whiteSpace: "nowrap" }}>
                    {formatDate(p.createdAt)}
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
