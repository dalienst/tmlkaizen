import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { locations, departments, users, staff, kaizenProjects, gmLocations, hrLocations } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/constants";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LocationDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  // Only SYSTEM_ADMIN is authorized
  if (session.user.role !== "SYSTEM_ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;

  // Load location details
  const loc = await db.query.locations.findFirst({
    where: eq(locations.id, id),
  });

  if (!loc) notFound();

  // Load departments in this location
  const locationDepts = await db
    .select()
    .from(departments)
    .where(eq(departments.locationId, id));

  const deptIds = locationDepts.map((d) => d.id);

  // Load General Managers assigned to this location
  const assignedGMs = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .innerJoin(gmLocations, eq(users.id, gmLocations.gmUserId))
    .where(eq(gmLocations.locationId, id));

  // Load HR Managers assigned to this location
  const assignedHRs = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .innerJoin(hrLocations, eq(users.id, hrLocations.hrUserId))
    .where(eq(hrLocations.locationId, id));

  // Load staff in this location's departments
  const locationStaff = deptIds.length > 0
    ? await db.select().from(staff).where(inArray(staff.departmentId, deptIds))
    : [];

  const staffCounts = locationStaff.reduce((acc, s) => {
    if (s.isActive) {
      acc[s.departmentId] = (acc[s.departmentId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Load submissions in this location's departments
  const submissions = deptIds.length > 0
    ? await db.query.kaizenProjects.findMany({
        where: inArray(kaizenProjects.departmentId, deptIds),
        orderBy: desc(kaizenProjects.createdAt),
        with: {
          staff: true,
          department: true,
        },
      })
    : [];

  const projectCounts = submissions.reduce((acc, p) => {
    acc[p.departmentId] = (acc[p.departmentId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalCount = submissions.length;
  const proposedCount = submissions.filter((s) => s.status === "PROPOSED").length;
  const inProgressCount = submissions.filter((s) => s.status === "IN_PROGRESS").length;
  const completedCount = submissions.filter((s) => s.status === "COMPLETED").length;

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <div>
          <Link href="/dashboard/locations" className="text-sub" style={{ fontSize: "0.8125rem", textDecoration: "none" }}>
            ← Locations
          </Link>
          <h1 className="font-semibold" style={{ fontSize: "1rem", marginTop: "0.25rem" }}>
            {loc.name}
          </h1>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Main header block */}
        <div className="card p-5 mb-6">
          <div className="text-sub font-semibold" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            Location Profile
          </div>
          <div className="text-muted" style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
            Branch Code: <strong>{loc.code || "—"}</strong> · Status: <span className={`badge ${loc.isActive ? "badge-completed" : "badge-neutral"}`} style={{ padding: "0.1rem 0.4rem", fontSize: "0.7rem" }}>{loc.isActive ? "Active" : "Inactive"}</span>
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
            <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Staff</div>
            <div className="font-semibold text-xl" style={{ marginTop: "0.25rem" }}>{locationStaff.filter(s => s.isActive).length}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6" style={{ alignItems: "start" }}>
          {/* Main content column (Col Span 2) */}
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Departments list */}
            <div className="card overflow-hidden">
              <div className="p-4 font-semibold border-b" style={{ fontSize: "0.875rem", borderColor: "var(--color-border)" }}>
                Departments under this location
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Staff Count</th>
                    <th>Kaizens</th>
                    <th style={{ width: "6rem" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {locationDepts.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                        No departments in this location.
                      </td>
                    </tr>
                  )}
                  {locationDepts.map((d) => {
                    const deptsStaff = staffCounts[d.id] ?? 0;
                    const deptsProj = projectCounts[d.id] ?? 0;
                    return (
                      <tr key={d.id}>
                        <td className="font-medium">{d.name}</td>
                        <td><code>{d.code}</code></td>
                        <td>{deptsStaff}</td>
                        <td>{deptsProj}</td>
                        <td>
                          <Link href={`/dashboard/departments/${d.id}`} className="text-link" style={{ fontSize: "0.8125rem", textDecoration: "none" }}>
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Submissions Log */}
            <div className="card overflow-hidden">
              <div className="p-4 font-semibold border-b" style={{ fontSize: "0.875rem", borderColor: "var(--color-border)" }}>
                Submissions Log
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Ref Number</th>
                    <th>Submitter</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ width: "6rem" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                        No submissions recorded in this location.
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
                      <td className="text-sub">{s.department?.name ?? "—"}</td>
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

          {/* Sidebar column (Col Span 1) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* General Managers */}
            <div className="card p-5">
              <h2 className="font-semibold text-sub mb-3" style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                General Managers (GM)
              </h2>
              {assignedGMs.length === 0 ? (
                <p className="text-muted" style={{ fontSize: "0.875rem" }}>No GMs assigned to this location.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {assignedGMs.map((gm) => (
                    <div key={gm.id} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                      <span className="font-medium" style={{ fontSize: "0.875rem" }}>{gm.name}</span>
                      <span className="text-sub" style={{ fontSize: "0.75rem" }}>{gm.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HR Managers */}
            <div className="card p-5">
              <h2 className="font-semibold text-sub mb-3" style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                HR Managers
              </h2>
              {assignedHRs.length === 0 ? (
                <p className="text-muted" style={{ fontSize: "0.875rem" }}>No HR managers assigned to this location.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {assignedHRs.map((hr) => (
                    <div key={hr.id} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                      <span className="font-medium" style={{ fontSize: "0.875rem" }}>{hr.name}</span>
                      <span className="text-sub" style={{ fontSize: "0.75rem" }}>{hr.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
