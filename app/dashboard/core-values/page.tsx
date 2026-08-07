import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  coreValues,
  kaizenProjects,
  departments,
  gmLocations,
  hrLocations,
} from "@/db/schema";
import { eq, inArray, count } from "drizzle-orm";
import Link from "next/link";

export const metadata = { title: "Core Values | Kaizen Tracker" };

export default async function CoreValuesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id as string;

  // Determine department scope for counting
  let allowedDeptIds: string[] | null = null;

  if (role === "DEPT_MANAGER") {
    allowedDeptIds = session.user.departmentId ? [session.user.departmentId] : [];
  } else if (role === "GM") {
    const gmLocs = await db.select({ locationId: gmLocations.locationId }).from(gmLocations).where(eq(gmLocations.gmUserId, userId));
    const locationIds = gmLocs.map((l) => l.locationId);
    if (locationIds.length > 0) {
      const depts = await db.select({ id: departments.id }).from(departments).where(inArray(departments.locationId, locationIds));
      allowedDeptIds = depts.map((d) => d.id);
    } else {
      allowedDeptIds = [];
    }
  } else if (role === "HR") {
    const hrLocs = await db.select({ locationId: hrLocations.locationId }).from(hrLocations).where(eq(hrLocations.hrUserId, userId));
    const locationIds = hrLocs.map((l) => l.locationId);
    if (locationIds.length > 0) {
      const depts = await db.select({ id: departments.id }).from(departments).where(inArray(departments.locationId, locationIds));
      allowedDeptIds = depts.map((d) => d.id);
    } else {
      allowedDeptIds = [];
    }
  }

  const allCVs = await db.select().from(coreValues).orderBy(coreValues.sortOrder);

  // Get all projects (scoped)
  const allProjects = allowedDeptIds !== null
    ? allowedDeptIds.length > 0
      ? await db.select({ coreValueIds: kaizenProjects.coreValueIds, status: kaizenProjects.status })
          .from(kaizenProjects)
          .where(inArray(kaizenProjects.departmentId, allowedDeptIds))
      : []
    : await db.select({ coreValueIds: kaizenProjects.coreValueIds, status: kaizenProjects.status }).from(kaizenProjects);

  // Build per-CV stats
  const cvStats = allCVs.map((cv) => {
    const related = allProjects.filter((p) => p.coreValueIds.includes(cv.id));
    const completed = related.filter((p) => p.status === "COMPLETED").length;
    return {
      ...cv,
      total: related.length,
      completed,
      rate: related.length > 0 ? Math.round((completed / related.length) * 100) : 0,
    };
  });

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Core Values</h1>
        <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
          {allCVs.length} value{allCVs.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="dashboard-content">
        {cvStats.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
            No core values defined yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {cvStats.map((cv) => (
              <Link
                key={cv.id}
                href={`/dashboard/core-values/${cv.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="card"
                  style={{
                    padding: "1.25rem 1.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1.5rem",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-semibold" style={{ marginBottom: "0.125rem" }}>{cv.name}</div>
                    {cv.description && (
                      <div className="text-sub" style={{ fontSize: "0.8125rem" }}>{cv.description}</div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: "10rem", flexShrink: 0 }}>
                    <div className="text-sub" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", textAlign: "right" }}>
                      {cv.completed}/{cv.total} completed
                    </div>
                    <div style={{ height: "6px", background: "var(--color-muted)", borderRadius: "3px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${cv.rate}%`,
                          height: "100%",
                          background: cv.rate >= 70
                            ? "var(--color-completed)"
                            : cv.rate >= 30
                              ? "var(--color-inprogress)"
                              : "var(--color-brand)",
                          borderRadius: "3px",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ textAlign: "right", minWidth: "3.5rem" }}>
                    <div style={{
                      fontSize: "1.25rem",
                      fontWeight: 600,
                      color: cv.rate >= 70 ? "var(--color-completed)" : cv.rate >= 30 ? "var(--color-inprogress)" : "var(--color-brand)",
                    }}>
                      {cv.rate}%
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>completion</div>
                  </div>

                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>→</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
