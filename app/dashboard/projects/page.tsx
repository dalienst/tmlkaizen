import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { kaizenProjects, staff, departments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/constants";

export const metadata = { title: "All Projects | Kaizen Tracker" };

export default async function AllProjectsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SYSTEM_ADMIN") redirect("/dashboard");

  const projects = await db
    .select({
      project: kaizenProjects,
      staffName: staff.name,
      staffCode: staff.staffId,
      deptName: departments.name,
    })
    .from(kaizenProjects)
    .leftJoin(staff, eq(kaizenProjects.staffId, staff.id))
    .leftJoin(departments, eq(kaizenProjects.departmentId, departments.id))
    .orderBy(desc(kaizenProjects.createdAt));

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1 className="font-semibold" style={{ fontSize: "1rem" }}>All Projects</h1>
        <div className="text-sub" style={{ fontSize: "0.8125rem" }}>{projects.length} submissions</div>
      </div>
      <div className="dashboard-content">
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
                  <th>Staff</th>
                  <th>Department</th>
                  <th>Idea</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(({ project, staffName, staffCode, deptName }) => (
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
                      <Link href={`/dashboard/projects/${project.id}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
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
