import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { kaizenProjects, departments, coreValues } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import GMProjectsClient from "./GMProjectsClient";

export const metadata = { title: "GM Projects Directory | Kaizen Tracker" };

export default async function GMProjectsPage() {
  const session = await auth();
  if (!session || (session.user.role !== "GM" && session.user.role !== "SYSTEM_ADMIN")) {
    redirect("/dashboard");
  }

  const user = session.user;

  // Fetch departments and core values
  const [allDepartments, allCoreValues] = await Promise.all([
    db.select().from(departments),
    db.select().from(coreValues),
  ]);

  // Query projects scoped to GM's branch (or all branches for Admin)
  let projectsQuery;
  if (user.role === "SYSTEM_ADMIN" || !user.locationId) {
    projectsQuery = db.query.kaizenProjects.findMany({
      orderBy: desc(kaizenProjects.createdAt),
      with: {
        staff: true,
        department: {
          with: {
            location: true,
          },
        },
      },
    });
  } else {
    // GM scoped to a location
    const deptIds = allDepartments
      .filter((d) => d.locationId === user.locationId)
      .map((d) => d.id);

    if (deptIds.length === 0) {
      projectsQuery = Promise.resolve([]);
    } else {
      projectsQuery = db.query.kaizenProjects.findMany({
        where: inArray(kaizenProjects.departmentId, deptIds),
        orderBy: desc(kaizenProjects.createdAt),
        with: {
          staff: true,
          department: {
            with: {
              location: true,
            },
          },
        },
      });
    }
  }

  const projects = await projectsQuery;

  // Format into rows for search client
  const projectRows = projects.map((p) => ({
    id: p.id,
    referenceNumber: p.referenceNumber,
    currentSituation: p.currentSituation,
    improvementIdea: p.improvementIdea,
    expectedBenefit: p.expectedBenefit,
    status: p.status,
    createdAt: p.createdAt,
    coreValueIds: p.coreValueIds,
    staffName: p.staff?.name ?? "—",
    staffId: p.staff?.staffId ?? "—",
    deptName: p.department.name,
    deptId: p.department.id,
    locName: p.department.location.name,
  }));

  return (
    <div className="dashboard-main p-4">
      <GMProjectsClient
        projects={projectRows}
        departments={allDepartments}
        coreValues={allCoreValues}
      />
    </div>
  );
}
