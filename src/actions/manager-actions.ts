"use server";

import { db } from "@/db";
import {
  kaizenProjects,
  users,
  groupManagersGroups,
  departments,
  gmLocations,
  hrLocations,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { syncUserToStaff } from "./admin-actions";
import { auth } from "@/auth";
import type { ProjectStatus } from "@/lib/constants";
import bcrypt from "bcryptjs";
import { z } from "zod";

const ALLOWED_STATUS_ROLES = ["DEPT_MANAGER", "SYSTEM_ADMIN", "GM", "HR", "GROUP_MANAGER"] as const;
type AllowedRole = (typeof ALLOWED_STATUS_ROLES)[number];

export async function updateProjectStatus(projectId: string, newStatus: ProjectStatus) {
  const session = await auth();
  if (!session || !ALLOWED_STATUS_ROLES.includes(session.user.role as AllowedRole)) {
    throw new Error("Unauthorized");
  }

  const project = await db.query.kaizenProjects.findFirst({
    where: eq(kaizenProjects.id, projectId),
  });

  if (!project) throw new Error("Project not found");

  const role = session.user.role;
  const userId = session.user.id;

  // DEPT_MANAGER can only update projects in their own department
  if (role === "DEPT_MANAGER" && project.departmentId !== session.user.departmentId) {
    throw new Error("Unauthorized");
  }

  // GM can only update projects in their managed locations
  if (role === "GM") {
    const gmLocs = await db.select({ locationId: gmLocations.locationId }).from(gmLocations).where(eq(gmLocations.gmUserId, userId));
    const locationIds = gmLocs.map((gl) => gl.locationId);
    const dept = await db.query.departments.findFirst({ where: eq(departments.id, project.departmentId) });
    if (!dept || !locationIds.includes(dept.locationId)) {
      throw new Error("Unauthorized");
    }
  }

  // HR can only update projects in their managed locations
  if (role === "HR") {
    const hrLocs = await db.select({ locationId: hrLocations.locationId }).from(hrLocations).where(eq(hrLocations.hrUserId, userId));
    const locationIds = hrLocs.map((hl) => hl.locationId);
    const dept = await db.query.departments.findFirst({ where: eq(departments.id, project.departmentId) });
    if (!dept || !locationIds.includes(dept.locationId)) {
      throw new Error("Unauthorized");
    }
  }

  // GROUP_MANAGER can only update projects in their managed groups
  if (role === "GROUP_MANAGER") {
    const mgrGroups = await db.select({ groupId: groupManagersGroups.groupId }).from(groupManagersGroups).where(eq(groupManagersGroups.groupManagerId, userId));
    const groupIds = mgrGroups.map((mg) => mg.groupId);
    const dept = await db.query.departments.findFirst({ where: eq(departments.id, project.departmentId) });
    if (!dept || !dept.groupId || !groupIds.includes(dept.groupId)) {
      throw new Error("Unauthorized");
    }
  }

  await db
    .update(kaizenProjects)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(kaizenProjects.id, projectId));

  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/gm");
  revalidatePath("/dashboard/group-manager");
  revalidatePath(`/dashboard/projects/${projectId}`);
}

// ─── Settings: Update own profile ─────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export async function updateUserProfile(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const raw = {
    name: formData.get("name"),
    currentPassword: (formData.get("currentPassword") as string) || undefined,
    newPassword: (formData.get("newPassword") as string) || undefined,
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, currentPassword, newPassword } = parsed.data;
  const userId = session.user.id as string;

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return { error: "User not found." };

  // If changing password, verify current password
  if (newPassword) {
    if (!currentPassword) {
      return { error: "Please enter your current password to set a new one." };
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return { error: "Current password is incorrect." };
    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ name, passwordHash: newHash }).where(eq(users.id, userId));
  } else {
    await db.update(users).set({ name }).where(eq(users.id, userId));
  }

  // Sync profile name to staff roster if linked as staff
  if (user.staffId && user.departmentId) {
    await syncUserToStaff(db, {
      name,
      email: user.email,
      staffId: user.staffId,
      departmentId: user.departmentId,
      isActive: user.isActive,
    });
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/staff");
  return { success: true };
}
