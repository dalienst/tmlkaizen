"use server";

import { db } from "@/db";
import { kaizenProjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { ProjectStatus } from "@/lib/constants";

export async function updateProjectStatus(projectId: number, newStatus: ProjectStatus) {
  const session = await auth();
  if (!session || (session.user.role !== "DEPT_MANAGER" && session.user.role !== "SYSTEM_ADMIN")) {
    throw new Error("Unauthorized");
  }

  const project = await db.query.kaizenProjects.findFirst({
    where: eq(kaizenProjects.id, projectId),
  });

  if (!project) throw new Error("Project not found");

  // DEPT_MANAGER can only update projects in their own department
  if (
    session.user.role === "DEPT_MANAGER" &&
    project.departmentId !== session.user.departmentId
  ) {
    throw new Error("Unauthorized: project belongs to a different department");
  }

  await db
    .update(kaizenProjects)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(kaizenProjects.id, projectId));

  revalidatePath("/dashboard/manager");
}
