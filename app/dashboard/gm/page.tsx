import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { kaizenProjects, departments, staff, coreValues, locations, gmLocations } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/constants";
import Link from "next/link";

export const metadata = { title: "GM Dashboard | Kaizen Tracker" };

export default async function GMPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const session = await auth();
  if (!session || (session.user.role !== "GM" && session.user.role !== "SYSTEM_ADMIN")) {
    redirect("/dashboard");
  }

  const userId = session.user.id as string;
  const { loc } = await searchParams;

  // Load all GM locations
  const gmLocs = await db
    .select({ locationId: gmLocations.locationId })
    .from(gmLocations)
    .where(eq(gmLocations.gmUserId, userId));

  const gmLocationIds = gmLocs.map((l) => l.locationId);

  if (gmLocationIds.length === 0) {
    return (
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h1 className="font-semibold" style={{ fontSize: "1rem" }}>GM Overview</h1>
        </div>
        <div className="dashboard-content">
          <div className="alert alert-warning">
            Your account is not assigned to any location. Please contact your system administrator.
          </div>
        </div>
      </div>
    );
  }

  // Load location details
  const allLocations = await db
    .select()
    .from(locations)
    .where(inArray(locations.id, gmLocationIds));

  // Selected location (default to first)
  const selectedLocId = loc && gmLocationIds.includes(loc) ? loc : gmLocationIds[0];
  const selectedLoc = allLocations.find((l) => l.id === selectedLocId);

  // Get departments for selected location
  const locationDepts = await db
    .select()
    .from(departments)
    .where(eq(departments.locationId, selectedLocId));

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

  const totalCount = projects.length;
  const proposedCount = projects.filter((p) => p.project.status === "PROPOSED").length;
  const inProgressCount = projects.filter((p) => p.project.status === "IN_PROGRESS").length;
  const completedCount = projects.filter((p) => p.project.status === "COMPLETED").length;
  const completionRate =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const deptBreakdown = locationDepts.map((d) => {
    const deptProjects = projects.filter((p) => p.project.departmentId === d.id);
    return {
      id: d.id,
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
        <div>
          <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Location Overview</h1>
          {selectedLoc && (
            <div className="text-sub" style={{ fontSize: "0.8125rem" }}>{selectedLoc.name}</div>
          )}
        </div>
        {/* Location switcher — only shown if GM manages multiple locations */}
        {allLocations.length > 1 && (
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            {allLocations.map((l) => (
              <Link
                key={l.id}
                href={`/dashboard/gm?loc=${l.id}`}
                className={`btn btn-sm ${selectedLocId === l.id ? "btn-primary" : "btn-secondary"}`}
              >
                {l.name}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="dashboard-content">

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total submissions" value={totalCount} />
          <StatCard label="Open (Proposed + In Progress)" value={proposedCount + inProgressCount} accentColor="var(--color-inprogress)" />
          <StatCard label="Completed" value={completedCount} accentColor="var(--color-completed)" />
          <StatCard label="Completion rate" value={`${completionRate}%`} accentColor={completionRate >= 50 ? "var(--color-completed)" : "var(--color-inprogress)"} />
        </div>

        {/* Quick nav cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { href: "/dashboard/departments", label: "Departments", desc: `${locationDepts.length} in this location`, icon: "🏢" },
            { href: "/dashboard/staff", label: "Staff", desc: "View all staff members", icon: "👥" },
            { href: "/dashboard/analytics", label: "Analytics", desc: "Stall detection & stats", icon: "📊" },
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
                    <Link
                      href={`/dashboard/departments/${dept.id}`}
                      className="font-medium"
                      style={{ fontSize: "0.875rem", textDecoration: "none", color: "var(--color-brand)" }}
                    >
                      {dept.name}
                    </Link>
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
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-semibold" style={{ fontSize: "0.9375rem" }}>Recent Projects</span>
            <Link href="/dashboard/gm/projects" className="btn btn-ghost btn-sm">View all →</Link>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                    No submissions yet across this location.
                  </td>
                </tr>
              )}
              {projects.slice(0, 20).map(({ project: p, staffName, staffId, deptName }) => (
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
                  <td>
                    <Link href={`/dashboard/projects/${p.id}`} className="btn btn-ghost btn-sm">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
