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
} from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { formatDate } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/Badge";
import Link from "next/link";

export const metadata = { title: "Analytics | Kaizen Tracker" };

function daysSince(date: Date | string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id as string;

  let allowedDeptIds: string[] | null = null;

  if (role === "DEPT_MANAGER") {
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

  const allDepts = await db.select().from(departments);
  const allLocations = await db.select().from(locations);
  const deptMap = Object.fromEntries(allDepts.map((d) => [d.id, d]));
  const locMap = Object.fromEntries(allLocations.map((l) => [l.id, l]));

  const projects = allowedDeptIds !== null
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

  const total = projects.length;
  const proposed = projects.filter((p) => p.project.status === "PROPOSED").length;
  const inProgress = projects.filter((p) => p.project.status === "IN_PROGRESS").length;
  const completed = projects.filter((p) => p.project.status === "COMPLETED").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Department breakdown
  const deptMap2: Record<string, { name: string; total: number; completed: number; inProgress: number; proposed: number; rate: number }> = {};
  for (const p of projects) {
    const dId = p.project.departmentId;
    if (!deptMap2[dId]) {
      deptMap2[dId] = { name: p.deptName ?? deptMap[dId]?.name ?? "Unknown", total: 0, completed: 0, inProgress: 0, proposed: 0, rate: 0 };
    }
    deptMap2[dId].total++;
    if (p.project.status === "COMPLETED") deptMap2[dId].completed++;
    else if (p.project.status === "IN_PROGRESS") deptMap2[dId].inProgress++;
    else deptMap2[dId].proposed++;
  }
  for (const d of Object.values(deptMap2)) {
    d.rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
  }
  const deptRows = Object.values(deptMap2).sort((a, b) => b.total - a.total);

  // Top staff contributors
  const staffMap: Record<string, { name: string; staffId: string; total: number; completed: number }> = {};
  for (const p of projects) {
    const sId = p.project.staffId;
    if (!staffMap[sId]) {
      staffMap[sId] = { name: p.staffName ?? "Unknown", staffId: p.staffId ?? "—", total: 0, completed: 0 };
    }
    staffMap[sId].total++;
    if (p.project.status === "COMPLETED") staffMap[sId].completed++;
  }
  const topStaff = Object.entries(staffMap)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Stall detection: PROPOSED or IN_PROGRESS for > 14 days
  const STALL_DAYS = 14;
  const stalled = projects.filter((p) => {
    if (p.project.status === "COMPLETED") return false;
    const days = daysSince(p.project.updatedAt);
    return days >= STALL_DAYS;
  }).sort((a, b) => daysSince(b.project.updatedAt) - daysSince(a.project.updatedAt));

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Analytics</h1>
      </div>
      <div className="dashboard-content">
        {/* Overview stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Submissions", value: total, color: "var(--color-brand)" },
            { label: "Proposed", value: proposed, color: "var(--color-proposed)" },
            { label: "In Progress", value: inProgress, color: "var(--color-inprogress)" },
            { label: "Completed", value: completed, color: "var(--color-completed)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ padding: "1.25rem", borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 600, color }}>{value}</div>
              <div className="text-sub" style={{ fontSize: "0.8125rem" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Overall completion */}
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
            <span className="font-semibold" style={{ fontSize: "0.875rem" }}>Overall Completion Rate</span>
            <span style={{ fontSize: "1rem", fontWeight: 600, color: completionRate >= 70 ? "var(--color-completed)" : completionRate >= 40 ? "var(--color-inprogress)" : "var(--color-brand)" }}>
              {completionRate}%
            </span>
          </div>
          <div style={{ height: "10px", background: "var(--color-muted)", borderRadius: "5px", overflow: "hidden" }}>
            <div style={{
              width: `${completionRate}%`,
              height: "100%",
              background: completionRate >= 70 ? "var(--color-completed)" : completionRate >= 40 ? "var(--color-inprogress)" : "var(--color-brand)",
              borderRadius: "5px",
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {/* Department breakdown */}
          <div>
            <div className="font-semibold" style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
              Department Performance
            </div>
            {deptRows.length === 0 ? (
              <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "var(--color-text-muted)" }}>No data.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {deptRows.map((d) => (
                  <div key={d.name} className="card" style={{ padding: "0.875rem 1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.375rem" }}>
                      <span className="font-medium" style={{ fontSize: "0.875rem" }}>{d.name}</span>
                      <span className="text-sub" style={{ fontSize: "0.75rem" }}>{d.completed}/{d.total} completed</span>
                    </div>
                    <div style={{ height: "5px", background: "var(--color-muted)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        width: `${d.rate}%`,
                        height: "100%",
                        background: d.rate >= 70 ? "var(--color-completed)" : d.rate >= 30 ? "var(--color-inprogress)" : "var(--color-brand)",
                        borderRadius: "3px",
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top contributors */}
          <div>
            <div className="font-semibold" style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
              Top Contributors
            </div>
            {topStaff.length === 0 ? (
              <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "var(--color-text-muted)" }}>No data.</div>
            ) : (
              <div className="card overflow-hidden">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Staff</th>
                      <th>ID</th>
                      <th>Total</th>
                      <th>Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topStaff.map((s, i) => (
                      <tr key={s.id}>
                        <td className="text-muted" style={{ fontSize: "0.8125rem" }}>{i + 1}</td>
                        <td className="font-medium">
                          <Link href={`/dashboard/staff/${s.id}`} style={{ textDecoration: "none", color: "var(--color-brand)" }}>
                            {s.name}
                          </Link>
                        </td>
                        <td><code style={{ fontSize: "0.75rem" }}>{s.staffId}</code></td>
                        <td><span className="badge badge-brand">{s.total}</span></td>
                        <td><span className="badge badge-completed">{s.completed}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Stall detection */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div className="font-semibold" style={{ fontSize: "0.875rem" }}>Stalled Projects</div>
            {stalled.length > 0 && (
              <span className="badge badge-inprogress">{stalled.length} stalled</span>
            )}
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
              (no status change in {STALL_DAYS}+ days)
            </span>
          </div>
          {stalled.length === 0 ? (
            <div className="card" style={{ padding: "1.25rem", textAlign: "center", color: "var(--color-completed)" }}>
              ✓ No stalled projects — everything is moving forward.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table>
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Staff</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Days stalled</th>
                    <th>Last updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stalled.map(({ project, staffName, deptName }) => {
                    const days = daysSince(project.updatedAt);
                    return (
                      <tr key={project.id} style={{ background: days >= 30 ? "hsl(0 68% 98%)" : undefined }}>
                        <td><code style={{ fontSize: "0.8125rem" }}>{project.referenceNumber}</code></td>
                        <td className="font-medium">{staffName ?? "—"}</td>
                        <td className="text-sub">{deptName ?? "—"}</td>
                        <td><StatusBadge status={project.status} /></td>
                        <td>
                          <span style={{
                            fontWeight: 600,
                            color: days >= 30 ? "var(--color-danger)" : "var(--color-warning)",
                          }}>
                            {days}d
                          </span>
                        </td>
                        <td className="text-sub">{formatDate(project.updatedAt)}</td>
                        <td>
                          <Link href={`/dashboard/projects/${project.id}`} className="btn btn-ghost btn-sm">
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
    </div>
  );
}
