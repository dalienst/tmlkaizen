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
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "1.5rem 1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/dashboard" className="text-link" style={{ fontSize: "0.875rem", textDecoration: "none" }}>
          ← Back to Dashboard
        </Link>
      </div>

      <ProjectDetailClient
        project={project}
        cvMap={cvMap}
        canEdit={canEdit}
      />
    </div>
  );
}
