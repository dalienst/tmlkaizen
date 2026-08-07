import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { staff, departments, locations, kaizenProjects, coreValues } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/constants";
import { updateProjectStatus } from "@/actions/manager-actions";
import ProjectStatusForm from "@/components/ui/ProjectStatusForm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await db.query.staff.findFirst({ where: eq(staff.id, Number(id)) });
  return { title: member ? `${member.name} | Staff | Kaizen Tracker` : "Staff Member | Kaizen Tracker" };
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const staffId = Number(id);
  const member = await db.query.staff.findFirst({ where: eq(staff.id, staffId) });
  if (!member) notFound();

  const dept = await db.query.departments.findFirst({ where: eq(departments.id, member.departmentId) });
  const loc = dept ? await db.query.locations.findFirst({ where: eq(locations.id, dept.locationId) }) : null;

  // DEPT_MANAGER: can only see staff in their own department
  if (session.user.role === "DEPT_MANAGER" && member.departmentId !== session.user.departmentId) {
    notFound();
  }

  const projects = await db
    .select({
      project: kaizenProjects,
    })
    .from(kaizenProjects)
    .where(eq(kaizenProjects.staffId, staffId))
    .orderBy(desc(kaizenProjects.createdAt));

  const allCoreValues = await db.select().from(coreValues);
  const cvMap = Object.fromEntries(allCoreValues.map((cv) => [cv.id, cv.name]));

  const proposed = projects.filter((p) => p.project.status === "PROPOSED").length;
  const inProgress = projects.filter((p) => p.project.status === "IN_PROGRESS").length;
  const completed = projects.filter((p) => p.project.status === "COMPLETED").length;

  const canChangeStatus = ["SYSTEM_ADMIN", "GM", "HR", "DEPT_MANAGER"].includes(session.user.role);

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <div>
          <Link href="/dashboard/staff" className="text-sub" style={{ fontSize: "0.8125rem", textDecoration: "none" }}>
            ← Staff
          </Link>
          <h1 className="font-semibold" style={{ fontSize: "1rem", marginTop: "0.25rem" }}>{member.name}</h1>
        </div>
      </div>
      <div className="dashboard-content">
        {/* Profile card */}
        <div className="grid grid-cols-2 gap-4 mb-6" style={{ gridTemplateColumns: "1fr 2fr" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <div className="font-semibold" style={{ marginBottom: "1rem" }}>Profile</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                { label: "Staff ID", value: <code style={{ fontSize: "0.8125rem" }}>{member.staffId}</code> },
                { label: "Email", value: <span className="text-sub">{member.email}</span> },
                { label: "Department", value: dept?.name ?? "—" },
                { label: "Location", value: loc?.name ?? "—" },
                { label: "Added", value: formatDate(member.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem" }}>
                  <span className="text-sub" style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>{label}</span>
                  <span className="font-medium" style={{ fontSize: "0.875rem", textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {[
              { label: "Total", value: projects.length, color: "var(--color-brand)" },
              { label: "In Progress", value: inProgress, color: "var(--color-inprogress)" },
              { label: "Completed", value: completed, color: "var(--color-completed)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="card" style={{ padding: "1.25rem", borderTop: `3px solid ${color}` }}>
                <div style={{ fontSize: "1.75rem", fontWeight: 600, color }}>{value}</div>
                <div className="text-sub" style={{ fontSize: "0.8125rem" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="font-semibold" style={{ marginBottom: "0.75rem" }}>
          Kaizen Submissions ({projects.length})
        </div>
        {projects.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
            No submissions yet.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Core Values</th>
                  <th>Idea</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(({ project }) => (
                  <tr key={project.id}>
                    <td><code style={{ fontSize: "0.8125rem" }}>{project.referenceNumber}</code></td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {project.coreValueIds.map((cvId) => (
                          <span key={cvId} className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                            {cvMap[cvId] ?? `CV-${cvId}`}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-sub" style={{ maxWidth: "18rem" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.improvementIdea}
                      </div>
                    </td>
                    <td><StatusBadge status={project.status} /></td>
                    <td className="text-sub">{formatDate(project.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <Link href={`/dashboard/projects/${project.id}`} className="btn btn-ghost btn-sm">
                          View
                        </Link>
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
