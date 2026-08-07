import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { departments, users, staff, kaizenProjects, hrLocations, gmLocations } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/constants";
import ProjectStatusForm from "@/components/ui/ProjectStatusForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DepartmentDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) notFound();

  // Load department and location details
  const dept = await db.query.departments.findFirst({
    where: eq(departments.id, id),
    with: {
      location: true,
    },
  });

  if (!dept) notFound();

  // Access check
  let allowed = false;
  const user = session.user;

  if (user.role === "SYSTEM_ADMIN") {
    allowed = true;
  } else if (user.role === "GM") {
    // Check against gm_locations (multi-location support)
    const gmLocs = await db.select({ locationId: gmLocations.locationId }).from(gmLocations).where(eq(gmLocations.gmUserId, Number(user.id)));
    allowed = gmLocs.some((gl) => gl.locationId === dept.locationId);
  } else if (user.role === "DEPT_MANAGER") {
    allowed = user.departmentId === id;
  } else if (user.role === "HR") {
    const hrLocs = await db.query.hrLocations.findMany({
      where: eq(hrLocations.hrUserId, Number(user.id)),
    });
    allowed = hrLocs.some((hl) => hl.locationId === dept.locationId);
  }

  if (!allowed) {
    redirect("/dashboard");
  }

  // Load active managers for this department
  const managers = await db
    .select()
    .from(users)
    .where(eq(users.departmentId, id));

  // Load staff headcount
  const activeStaff = await db
    .select()
    .from(staff)
    .where(eq(staff.departmentId, id));

  // Load all Kaizen submissions in this department
  const submissions = await db.query.kaizenProjects.findMany({
    where: eq(kaizenProjects.departmentId, id),
    orderBy: desc(kaizenProjects.createdAt),
    with: {
      staff: true,
    },
  });

  const totalCount = submissions.length;
  const proposedCount = submissions.filter((s) => s.status === "PROPOSED").length;
  const inProgressCount = submissions.filter((s) => s.status === "IN_PROGRESS").length;
  const completedCount = submissions.filter((s) => s.status === "COMPLETED").length;

  return (
    <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "1.5rem 1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/dashboard/departments" className="text-link" style={{ fontSize: "0.875rem", textDecoration: "none" }}>
          ← Departments
        </Link>
      </div>

      {/* Main header block */}
      <div className="card p-5 mb-6">
        <div className="text-sub font-semibold" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
          Department Profile
        </div>
        <h1 className="font-semibold" style={{ fontSize: "1.25rem", margin: 0, color: "var(--color-text)" }}>
          {dept.name}
        </h1>
        <div className="text-muted" style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
          Location Branch: <strong>{dept.location.name}</strong>
        </div>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Submissions</div>
          <div className="font-semibold text-xl" style={{ marginTop: "0.25rem" }}>{totalCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Proposed / In Progress</div>
          <div className="font-semibold text-xl" style={{ marginTop: "0.25rem", color: "var(--color-brand)" }}>
            {proposedCount} / {inProgressCount}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Completed</div>
          <div className="font-semibold text-xl" style={{ marginTop: "0.25rem", color: "var(--color-completed)" }}>{completedCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Staff Headcount</div>
          <div className="font-semibold text-xl" style={{ marginTop: "0.25rem" }}>{activeStaff.filter(s => s.isActive).length}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6" style={{ alignItems: "start" }}>
        {/* Submissions List (Col Span 2) */}
        <div style={{ gridColumn: "span 2" }}>
          <div className="card overflow-hidden">
            <div className="p-4 font-semibold border-b" style={{ fontSize: "0.875rem", borderColor: "var(--color-border)" }}>
              Submissions Log
            </div>
            <table>
              <thead>
                <tr>
                  <th>Ref Number</th>
                  <th>Submitter</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ width: "6rem" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                      No submissions recorded in this department.
                    </td>
                  </tr>
                )}
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <code style={{ fontSize: "0.8125rem", background: "var(--color-muted)", padding: "1px 6px", borderRadius: "3px" }}>
                        {s.referenceNumber}
                      </code>
                    </td>
                    <td className="font-medium">{s.staff?.name ?? "—"}</td>
                    <td className="text-sub">{formatDate(s.createdAt)}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      <Link href={`/dashboard/projects/${s.id}`} className="text-link" style={{ fontSize: "0.8125rem", textDecoration: "none" }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Directory Details (Col Span 1) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Active Managers */}
          <div className="card p-5">
            <h2 className="font-semibold text-sub mb-3" style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Assigned Managers
            </h2>
            {managers.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.875rem" }}>No managers assigned.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {managers.map((m) => (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                    <span className="font-medium" style={{ fontSize: "0.875rem" }}>{m.name}</span>
                    <span className="text-sub" style={{ fontSize: "0.75rem" }}>{m.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department Staff List */}
          <div className="card p-5">
            <h2 className="font-semibold text-sub mb-3" style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Staff Directory
            </h2>
            {activeStaff.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.875rem" }}>No staff in department.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "20rem", overflowY: "auto", paddingRight: "0.25rem" }}>
                {activeStaff.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "between", alignItems: "center", borderBottom: "1px dashed var(--color-border)", paddingBottom: "0.375rem" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span className="font-medium" style={{ fontSize: "0.8125rem" }}>{s.name}</span>
                      <code style={{ fontSize: "0.75rem", color: "var(--color-text-sub)" }}>{s.staffId}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
