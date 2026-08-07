import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import {
  coreValues,
  kaizenProjects,
  staff,
  departments,
  gmLocations,
  hrLocations,
} from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/constants";
import ProjectStatusForm from "@/components/ui/ProjectStatusForm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cv = await db.query.coreValues.findFirst({ where: eq(coreValues.id, Number(id)) });
  return { title: cv ? `${cv.name} | Core Values | Kaizen Tracker` : "Core Value | Kaizen Tracker" };
}

export default async function CoreValueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = Number(session.user.id);
  const cvId = Number(id);

  const cv = await db.query.coreValues.findFirst({ where: eq(coreValues.id, cvId) });
  if (!cv) notFound();

  // Determine department scope
  let allowedDeptIds: number[] | null = null;

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

  // Load projects for this core value (scoped)
  const allProjectsRaw = allowedDeptIds !== null
    ? allowedDeptIds.length > 0
      ? await db.select({ project: kaizenProjects, staffName: staff.name, deptName: departments.name })
          .from(kaizenProjects)
          .leftJoin(staff, eq(kaizenProjects.staffId, staff.id))
          .leftJoin(departments, eq(kaizenProjects.departmentId, departments.id))
          .where(inArray(kaizenProjects.departmentId, allowedDeptIds))
          .orderBy(desc(kaizenProjects.createdAt))
      : []
    : await db.select({ project: kaizenProjects, staffName: staff.name, deptName: departments.name })
        .from(kaizenProjects)
        .leftJoin(staff, eq(kaizenProjects.staffId, staff.id))
        .leftJoin(departments, eq(kaizenProjects.departmentId, departments.id))
        .orderBy(desc(kaizenProjects.createdAt));

  // Filter to only projects that include this core value
  const related = allProjectsRaw.filter((r) => r.project.coreValueIds.includes(cvId));

  const proposed = related.filter((r) => r.project.status === "PROPOSED").length;
  const inProgress = related.filter((r) => r.project.status === "IN_PROGRESS").length;
  const completed = related.filter((r) => r.project.status === "COMPLETED").length;
  const rate = related.length > 0 ? Math.round((completed / related.length) * 100) : 0;

  const canChangeStatus = ["SYSTEM_ADMIN", "GM", "HR", "DEPT_MANAGER"].includes(role);

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <div>
          <Link href="/dashboard/core-values" className="text-sub" style={{ fontSize: "0.8125rem", textDecoration: "none" }}>
            ← Core Values
          </Link>
          <h1 className="font-semibold" style={{ fontSize: "1rem", marginTop: "0.25rem" }}>{cv.name}</h1>
          {cv.description && <div className="text-sub" style={{ fontSize: "0.8125rem" }}>{cv.description}</div>}
        </div>
      </div>
      <div className="dashboard-content">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: related.length, color: "var(--color-brand)" },
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

        {/* Progress bar */}
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span className="font-semibold" style={{ fontSize: "0.875rem" }}>Completion rate</span>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: rate >= 70 ? "var(--color-completed)" : rate >= 30 ? "var(--color-inprogress)" : "var(--color-brand)" }}>{rate}%</span>
          </div>
          <div style={{ height: "8px", background: "var(--color-muted)", borderRadius: "4px", overflow: "hidden" }}>
            <div
              style={{
                width: `${rate}%`,
                height: "100%",
                background: rate >= 70 ? "var(--color-completed)" : rate >= 30 ? "var(--color-inprogress)" : "var(--color-brand)",
                borderRadius: "4px",
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>

        {/* Projects table */}
        <div className="font-semibold" style={{ marginBottom: "0.75rem" }}>Related Projects ({related.length})</div>
        {related.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
            No projects linked to this core value yet.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Staff</th>
                  <th>Department</th>
                  <th>Idea</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {related.map(({ project, staffName, deptName }) => (
                  <tr key={project.id}>
                    <td><code style={{ fontSize: "0.8125rem" }}>{project.referenceNumber}</code></td>
                    <td className="font-medium">{staffName ?? "—"}</td>
                    <td className="text-sub">{deptName ?? "—"}</td>
                    <td className="text-sub" style={{ maxWidth: "16rem" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.improvementIdea}
                      </div>
                    </td>
                    <td><StatusBadge status={project.status} /></td>
                    <td className="text-sub">{formatDate(project.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <Link href={`/dashboard/projects/${project.id}`} className="btn btn-ghost btn-sm">View</Link>
                        {canChangeStatus && (
                          <ProjectStatusForm projectId={project.id} currentStatus={project.status} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
