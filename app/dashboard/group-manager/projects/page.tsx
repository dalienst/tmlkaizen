import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { kaizenProjects, departments, coreValues, groupManagersGroups } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import GroupManagerProjectsClient from "./GroupManagerProjectsClient";

export const metadata = { title: "Group Projects Directory | Kaizen Tracker" };

export default async function GroupManagerProjectsPage() {
  const session = await auth();
  if (!session || (session.user.role !== "GROUP_MANAGER" && session.user.role !== "SYSTEM_ADMIN")) {
    redirect("/dashboard");
  }

  const user = session.user;
  const userId = user.id;

  // Fetch departments and core values
  const [allDepartments, allCoreValues] = await Promise.all([
    db.select().from(departments),
    db.select().from(coreValues),
  ]);

  // Query projects scoped to Group Manager's groups (or all for Admin)
  let projectsQuery;
  let scopedDepartments = allDepartments;

  if (user.role === "SYSTEM_ADMIN") {
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
    // Get managed groups
    const mgrGroups = await db
      .select({ groupId: groupManagersGroups.groupId })
      .from(groupManagersGroups)
      .where(eq(groupManagersGroups.groupManagerId, userId));
    const groupIds = mgrGroups.map((g) => g.groupId);

    scopedDepartments = allDepartments.filter(
      (d) => d.groupId && groupIds.includes(d.groupId)
    );
    const deptIds = scopedDepartments.map((d) => d.id);

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
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1 className="font-semibold" style={{ fontSize: "1rem" }}>Projects Log</h1>
      </div>
      <div className="dashboard-content">
        <GroupManagerProjectsClient
          projects={projectRows}
          departments={scopedDepartments}
          coreValues={allCoreValues}
        />
      </div>
    </div>
  );
}
