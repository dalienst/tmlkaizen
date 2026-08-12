import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  kaizenProjects,
  departments,
  staff,
  coreValues,
  groups,
  groupManagersGroups,
} from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/constants";
import Link from "next/link";

export const metadata = { title: "Group Manager Dashboard | Kaizen Tracker" };

export default async function GroupManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await auth();
  if (!session || (session.user.role !== "GROUP_MANAGER" && session.user.role !== "SYSTEM_ADMIN")) {
    redirect("/dashboard");
  }

  const userId = session.user.id as string;
  const { group } = await searchParams;

  // Load all Group Manager groups
  let groupIds: string[] = [];
  if (session.user.role === "SYSTEM_ADMIN") {
    const allGrps = await db.select({ id: groups.id }).from(groups);
    groupIds = allGrps.map((g) => g.id);
  } else {
    const mgrGroupsMapped = await db
      .select({ groupId: groupManagersGroups.groupId })
      .from(groupManagersGroups)
      .where(eq(groupManagersGroups.groupManagerId, userId));
    groupIds = mgrGroupsMapped.map((g) => g.groupId);
  }

  if (groupIds.length === 0) {
    return (
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Group Manager Overview</h1>
        </div>
        <div className="dashboard-content">
          <div className="alert alert-warning">
            Your account is not assigned to any group. Please contact your system administrator.
          </div>
        </div>
      </div>
    );
  }

  // Load group details
  const allGroups = await db
    .select()
    .from(groups)
    .where(inArray(groups.id, groupIds));

  // Selected group
  const selectedGroupId = group && groupIds.includes(group) ? group : groupIds[0];
  const selectedGroup = allGroups.find((g) => g.id === selectedGroupId);

  // Get departments for selected group
  const groupDepts = await db
    .select()
    .from(departments)
    .where(eq(departments.groupId, selectedGroupId));

  const deptIds = groupDepts.map((d) => d.id);

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

  const deptBreakdown = groupDepts.map((d) => {
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
          <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Group Overview</h1>
          {selectedGroup && (
            <div className="text-sub" style={{ fontSize: "0.8125rem" }}>{selectedGroup.name}</div>
          )}
        </div>
        {allGroups.length > 1 && (
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            {allGroups.map((g) => (
              <Link
                key={g.id}
                href={`/dashboard/group-manager?group=${g.id}`}
                className={`btn btn-sm ${selectedGroupId === g.id ? "btn-primary" : "btn-secondary"}`}
              >
                {g.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-content">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total submissions" value={totalCount} />
          <StatCard label="Open (Proposed + In Progress)" value={proposedCount + inProgressCount} accentColor="var(--color-inprogress)" />
          <StatCard label="Completed" value={completedCount} accentColor="var(--color-completed)" />
          <StatCard label="Completion rate" value={`${completionRate}%`} accentColor={completionRate >= 50 ? "var(--color-completed)" : "var(--color-inprogress)"} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { href: "/dashboard/departments", label: "Departments", desc: `${groupDepts.length} in this group`, icon: "🏢" },
            { href: "/dashboard/staff", label: "Staff", desc: "View group staff members", icon: "👥" },
            { href: "/dashboard/analytics", label: "Analytics", desc: "Performance insights", icon: "📊" },
          ].map((card) => (
            <Link key={card.href} href={card.href} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                <span style={{ fontSize: "1.25rem" }}>{card.icon}</span>
                <div>
                  <h3 className="font-semibold text-sm" style={{ margin: 0, color: "var(--color-text)" }}>{card.label}</h3>
                  <p className="text-sub" style={{ fontSize: "0.75rem", margin: "0.125rem 0 0 0" }}>{card.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Recent submissions */}
          <div className="col-span-8 card overflow-hidden">
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="font-semibold" style={{ fontSize: "0.9375rem" }}>Recent Submissions</span>
              <Link href="/dashboard/group-manager/projects" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
                View all →
              </Link>
            </div>

            <div className="overflow-hidden">
              <table style={{ margin: 0 }}>
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
                        No submissions yet.
                      </td>
                    </tr>
                  )}
                  {projects.slice(0, 10).map(({ project: p, staffName, staffId, deptName }) => (
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

          {/* Department stats */}
          <div className="col-span-4 card p-5">
            <div className="font-semibold mb-4" style={{ fontSize: "0.9375rem" }}>
              Department Breakdown
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {deptBreakdown.length === 0 && (
                <div className="text-muted text-center py-4" style={{ fontSize: "0.8125rem" }}>
                  No departments found.
                </div>
              )}
              {deptBreakdown.slice(0, 6).map((db) => {
                const rate = db.total > 0 ? Math.round((db.completed / db.total) * 100) : 0;
                return (
                  <div key={db.id}>
                    <div className="flex items-center justify-between mb-1">
                      <Link
                        href={`/dashboard/departments/${db.id}`}
                        className="font-medium"
                        style={{ fontSize: "0.875rem", textDecoration: "none", color: "var(--color-brand)" }}
                      >
                        {db.name}
                      </Link>
                      <span className="text-sub" style={{ fontSize: "0.8125rem" }}>
                        {db.total} total
                      </span>
                    </div>
                    <div style={{ display: "flex", height: "0.5rem", borderRadius: "var(--radius)", overflow: "hidden", background: "var(--color-muted)" }}>
                      {db.total > 0 && (
                        <>
                          <div
                            style={{ width: `${(db.completed / db.total) * 100}%`, background: "var(--color-completed)", transition: "width 300ms ease" }}
                            title={`Completed: ${db.completed}`}
                          />
                          <div
                            style={{ width: `${(db.inProgress / db.total) * 100}%`, background: "var(--color-inprogress)", transition: "width 300ms ease" }}
                            title={`In Progress: ${db.inProgress}`}
                          />
                          <div
                            style={{ width: `${(db.proposed / db.total) * 100}%`, background: "var(--color-proposed)", opacity: 0.4 }}
                            title={`Proposed: ${db.proposed}`}
                          />
                        </>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      <span>✓ {db.completed} done</span>
                      <span>◎ {db.inProgress} in progress</span>
                      <span>○ {db.proposed} proposed</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
