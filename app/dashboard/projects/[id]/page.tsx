import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { kaizenProjects, coreValues, hrLocations } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import ProjectDetailClient from "./ProjectDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) notFound();

  // Load project with staff and department relations
  const project = await db.query.kaizenProjects.findFirst({
    where: eq(kaizenProjects.id, id),
    with: {
      staff: true,
      department: {
        with: {
          location: true,
        },
      },
    },
  });

  if (!project) notFound();

  // Access control
  let allowed = false;
  const user = session.user;

  if (user.role === "SYSTEM_ADMIN") {
    allowed = true;
  } else if (user.role === "GM") {
    allowed = !user.locationId || user.locationId === project.department.locationId;
  } else if (user.role === "DEPT_MANAGER") {
    allowed = user.departmentId === project.departmentId;
  } else if (user.role === "HR") {
    const hrLocs = await db.query.hrLocations.findMany({
      where: eq(hrLocations.hrUserId, Number(user.id)),
    });
    allowed = hrLocs.some((hl) => hl.locationId === project.department.locationId);
  }

  if (!allowed) {
    redirect("/dashboard");
  }

  // Load core values for mapping
  const allCoreValues = await db.select().from(coreValues);
  const cvMap = Object.fromEntries(allCoreValues.map((cv) => [cv.id, cv.name]));

  // Can the current user advance this project's status?
  const canEdit =
    user.role === "SYSTEM_ADMIN" ||
    (user.role === "DEPT_MANAGER" && user.departmentId === project.departmentId);

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <div>
          <Link href="/dashboard" className="text-sub" style={{ fontSize: "0.8125rem", textDecoration: "none" }}>
            ← Dashboard
          </Link>
          <h1 className="font-semibold" style={{ fontSize: "1rem", marginTop: "0.25rem" }}>
            Project Details
          </h1>
        </div>
      </div>

      <div className="dashboard-content">
        <ProjectDetailClient
          project={project}
          cvMap={cvMap}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
