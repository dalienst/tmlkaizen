"use server";

import { db } from "@/db";
import {
  locations,
  departments,
  users,
  hrLocations,
  gmLocations,
  coreValues,
  staff,
  groups,
  groupManagersGroups,
  managersDepartments,
} from "@/db/schema";
import { eq, and, not, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email";
import type { UserRole } from "@/lib/constants";
import { z } from "zod";

// ─── Guard: only SYSTEM_ADMIN ──────────────────────────────────────────────────
async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== "SYSTEM_ADMIN") {
    throw new Error("Unauthorized");
  }
}

// ─── Guard: SYSTEM_ADMIN or HR ──────────────────────────────────────────────────
async function assertAdminOrHR() {
  const session = await auth();
  if (session?.user?.role !== "SYSTEM_ADMIN" && session?.user?.role !== "HR") {
    throw new Error("Unauthorized");
  }
}

// ─── Helper: sync user info into staff roster ───────────────────────────────────
export async function syncUserToStaff(
  tx: any,
  data: {
    name: string;
    email: string;
    staffId: string | null;
    departmentId: string | null;
    isActive: boolean;
  }
) {
  if (!data.staffId || !data.departmentId) return;
  const cleanStaffId = data.staffId.trim();
  if (!cleanStaffId) return;

  const existingStaff = await tx.query.staff.findFirst({
    where: eq(staff.staffId, cleanStaffId),
  });

  if (existingStaff) {
    await tx
      .update(staff)
      .set({
        name: data.name,
        email: data.email,
        departmentId: data.departmentId,
        isActive: data.isActive,
      })
      .where(eq(staff.id, existingStaff.id));
  } else {
    await tx.insert(staff).values({
      staffId: cleanStaffId,
      name: data.name,
      email: data.email,
      departmentId: data.departmentId,
      isActive: data.isActive,
    });
  }
}


// ─── Locations ─────────────────────────────────────────────────────────────────

export async function createLocation(formData: FormData) {
  await assertAdmin();
  const name = (formData.get("name") as string).trim();
  let code = (formData.get("code") as string)?.trim().toUpperCase() || "";

  if (!name) return { error: "Name is required." };

  if (!code) {
    code = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length > 10) code = code.substring(0, 10);
    if (!code) code = "LOC-" + Math.floor(1000 + Math.random() * 9000);
  }

  // Verify unique location code
  const existing = await db.query.locations.findFirst({
    where: eq(locations.code, code),
  });
  if (existing) {
    return { error: `Location code "${code}" is already in use.` };
  }

  await db.insert(locations).values({ name, code });
  revalidatePath("/dashboard/admin");
}

export async function updateLocation(formData: FormData) {
  await assertAdmin();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string).trim();
  let code = (formData.get("code") as string)?.trim().toUpperCase() || "";

  if (!name || !id) return { error: "ID and Name are required." };

  if (!code) {
    code = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length > 10) code = code.substring(0, 10);
    if (!code) code = "LOC-" + Math.floor(1000 + Math.random() * 9000);
  }

  // Verify uniqueness
  const existing = await db.query.locations.findFirst({
    where: and(eq(locations.code, code), not(eq(locations.id, id))),
  });
  if (existing) {
    return { error: `Location code "${code}" is already in use.` };
  }

  await db.update(locations).set({ name, code }).where(eq(locations.id, id));
  revalidatePath("/dashboard/admin");
}

export async function toggleLocationActive(id: string, isActive: boolean) {
  await assertAdmin();
  await db.update(locations).set({ isActive }).where(eq(locations.id, id));
  revalidatePath("/dashboard/admin");
}

export async function bulkCreateLocations(
  rows: { name: string; code?: string }[]
) {
  await assertAdmin();
  if (rows.length === 0) return { error: "No locations to create." };

  const allLocs = await db.select({ code: locations.code }).from(locations);
  const existingCodes = new Set(allLocs.map((l) => l.code.toUpperCase()));

  const toInsert: { name: string; code: string }[] = [];
  const codesInPayload = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const name = rows[i].name.trim();
    let code = rows[i].code?.trim().toUpperCase() || "";

    if (!name) continue; // Skip empty rows

    if (!code) {
      code = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length > 10) code = code.substring(0, 10);
      if (!code) code = "LOC-" + Math.floor(1000 + Math.random() * 9000);
    }

    if (existingCodes.has(code) || codesInPayload.has(code)) {
      return { error: `Location code "${code}" (Row ${i + 1}) is already in use.` };
    }

    codesInPayload.add(code);
    toInsert.push({ name, code });
  }

  if (toInsert.length === 0) {
    return { error: "Please enter details for at least one location." };
  }

  await db.insert(locations).values(toInsert).onConflictDoNothing({ target: locations.code });
  revalidatePath("/dashboard/admin");
  return { created: toInsert.length };
}

// ─── Departments ───────────────────────────────────────────────────────────────

export async function createDepartment(formData: FormData) {
  try {
    await assertAdminOrHR();
    const name = (formData.get("name") as string).trim();
    const locationId = formData.get("locationId") as string;
    let code = (formData.get("code") as string)?.trim().toUpperCase() || "";
    const groupIdVal = formData.get("groupId");
    const groupId = groupIdVal && groupIdVal !== "" ? (groupIdVal as string) : null;

    if (!name || !locationId) return { error: "Name and location are required." };

    if (!code) {
      code = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length > 10) code = code.substring(0, 10);
      if (!code) code = "DEPT-" + Math.floor(1000 + Math.random() * 9000);
    }

    // Verify unique department code
    const existing = await db.query.departments.findFirst({
      where: eq(departments.code, code),
    });
    if (existing) {
      return { error: `Department code "${code}" is already in use.` };
    }

    await db.insert(departments).values({ name, code, locationId, groupId });
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/departments");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to create department." };
  }
}

export async function updateDepartment(formData: FormData) {
  try {
    await assertAdminOrHR();
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string).trim();
    let code = (formData.get("code") as string)?.trim().toUpperCase() || "";
    const groupIdVal = formData.get("groupId");
    const groupId = groupIdVal && groupIdVal !== "" ? (groupIdVal as string) : null;

    if (!name || !id) return { error: "ID and Name are required." };

    if (!code) {
      code = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length > 10) code = code.substring(0, 10);
      if (!code) code = "DEPT-" + Math.floor(1000 + Math.random() * 9000);
    }

    // Verify uniqueness
    const existing = await db.query.departments.findFirst({
      where: and(eq(departments.code, code), not(eq(departments.id, id))),
    });
    if (existing) {
      return { error: `Department code "${code}" is already in use.` };
    }

    await db.update(departments).set({ name, code, groupId }).where(eq(departments.id, id));
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/departments");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update department." };
  }
}

export async function toggleDepartmentActive(id: string, isActive: boolean) {
  try {
    await assertAdminOrHR();
    await db.update(departments).set({ isActive }).where(eq(departments.id, id));
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/departments");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update department status." };
  }
}

export async function bulkCreateDepartments(
  rows: { name: string; code?: string; locationId: string; groupId?: string }[]
) {
  try {
    await assertAdminOrHR();
    if (rows.length === 0) return { error: "No departments to create." };

    const allDepts = await db.select({ code: departments.code }).from(departments);
    const existingCodes = new Set(allDepts.map((d) => d.code.toUpperCase()));

    const toInsert: { name: string; code: string; locationId: string; groupId: string | null }[] = [];
    const codesInPayload = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const name = rows[i].name.trim();
      const locationId = rows[i].locationId;
      let code = rows[i].code?.trim().toUpperCase() || "";
      const groupId = rows[i].groupId ? (rows[i].groupId as string) : null;

      if (!name || !locationId) continue; // Skip empty rows

      if (!code) {
        code = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (code.length > 10) code = code.substring(0, 10);
        if (!code) code = "DEPT-" + Math.floor(1000 + Math.random() * 9000);
      }

      if (existingCodes.has(code) || codesInPayload.has(code)) {
        return { error: `Department code "${code}" (Row ${i + 1}) is already in use.` };
      }

      codesInPayload.add(code);
      toInsert.push({ name, code, locationId, groupId });
    }

    if (toInsert.length === 0) {
      return { error: "Please enter details for at least one department." };
    }

    await db.insert(departments).values(toInsert).onConflictDoNothing({ target: departments.code });
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/departments");
    return { success: true, created: toInsert.length };
  } catch (err: any) {
    return { error: err.message || "Failed to create departments." };
  }
}

// ─── Core Values ───────────────────────────────────────────────────────────────

export async function createCoreValue(formData: FormData) {
  await assertAdmin();
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!name) return { error: "Name is required." };
  await db.insert(coreValues).values({ name, description, sortOrder });
  revalidatePath("/dashboard/admin");
}

export async function updateCoreValue(formData: FormData) {
  await assertAdmin();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!name || !id) return { error: "ID and Name are required." };
  await db
    .update(coreValues)
    .set({ name, description, sortOrder })
    .where(eq(coreValues.id, id));
  revalidatePath("/dashboard/admin");
}

export async function toggleCoreValueActive(id: string, isActive: boolean) {
  await assertAdmin();
  await db.update(coreValues).set({ isActive }).where(eq(coreValues.id, id));
  revalidatePath("/dashboard/admin");
}

// ─── Users ─────────────────────────────────────────────────────────────────────

function generatePassword(length = 12): string {
  const chars =
    "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  staffId: z.string().optional().nullable(),
  role: z.enum(["SYSTEM_ADMIN", "HR", "GM", "DEPT_MANAGER", "GROUP_MANAGER"]),
  locationId: z.string().uuid().nullable(),
  departmentId: z.string().uuid().nullable(),
  hrLocationIds: z.string().optional().nullable(), // JSON array of string UUIDs
  gmLocationIds: z.string().optional().nullable(), // JSON array of string UUIDs
  groupManagerGroupIds: z.string().optional().nullable(), // JSON array of string UUIDs
  managerDepartmentIds: z.string().optional().nullable(), // JSON array of string UUIDs
});

export async function createUser(formData: FormData) {
  await assertAdmin();

  const locationIdVal = formData.get("locationId");
  const departmentIdVal = formData.get("departmentId");

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    staffId: (formData.get("staffId") as string | null) || null,
    role: formData.get("role"),
    locationId: locationIdVal && locationIdVal !== "" ? (locationIdVal as string) : null,
    departmentId: departmentIdVal && departmentIdVal !== "" ? (departmentIdVal as string) : null,
    hrLocationIds: formData.get("hrLocationIds") as string | null,
    gmLocationIds: formData.get("gmLocationIds") as string | null,
    groupManagerGroupIds: formData.get("groupManagerGroupIds") as string | null,
    managerDepartmentIds: formData.get("managerDepartmentIds") as string | null,
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fill in all required fields correctly." };
  }

  const {
    name,
    email,
    staffId,
    role,
    locationId,
    departmentId,
    hrLocationIds,
    gmLocationIds,
    groupManagerGroupIds,
    managerDepartmentIds,
  } = parsed.data;

  // Validate department assignment
  const deptIds: string[] = managerDepartmentIds ? JSON.parse(managerDepartmentIds) : [];
  if (role === "DEPT_MANAGER" && deptIds.length === 0 && !departmentId) {
    return { error: "At least one department must be assigned for Department Managers." };
  }

  // Check for existing email
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) return { error: "A user with this email already exists." };

  const temporaryPassword = generatePassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const homeDeptId = departmentId || deptIds[0] || null;

  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email,
      staffId: staffId || null,
      passwordHash,
      role: role as UserRole,
      locationId: locationId ?? null,
      departmentId: homeDeptId,
    })
    .returning({ id: users.id });

  // Sync to staff roster if staffId is present
  if (staffId && homeDeptId) {
    await syncUserToStaff(db, {
      name,
      email,
      staffId,
      departmentId: homeDeptId,
      isActive: true,
    });
  }

  // For HR, insert hr_locations join rows
  if (role === "HR" && hrLocationIds) {
    const locIds: string[] = JSON.parse(hrLocationIds);
    if (locIds.length > 0) {
      await db.insert(hrLocations).values(
        locIds.map((lid) => ({ hrUserId: newUser.id, locationId: lid }))
      );
    }
  }

  // For GM, insert gm_locations join rows
  if (role === "GM" && gmLocationIds) {
    const locIds: string[] = JSON.parse(gmLocationIds);
    if (locIds.length > 0) {
      await db.insert(gmLocations).values(
        locIds.map((lid) => ({ gmUserId: newUser.id, locationId: lid }))
      );
    }
  }

  // For Group Managers, insert group managers groups join rows
  if (role === "GROUP_MANAGER" && groupManagerGroupIds) {
    const grpIds: string[] = JSON.parse(groupManagerGroupIds);
    if (grpIds.length > 0) {
      await db.insert(groupManagersGroups).values(
        grpIds.map((gid) => ({ groupManagerId: newUser.id, groupId: gid }))
      );
    }
  }

  // For DEPT_MANAGER, insert managers_departments join rows
  if (role === "DEPT_MANAGER" && deptIds.length > 0) {
    await db.insert(managersDepartments).values(
      deptIds.map((did) => ({ managerUserId: newUser.id, departmentId: did }))
    );
  }

  // Send welcome email
  try {
    await sendWelcomeEmail({ to: email, name, email, temporaryPassword });
  } catch {
    // Don't fail the whole action if email fails
    console.error("Welcome email failed to send");
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/staff");
}

export async function toggleUserActive(id: string, isActive: boolean) {
  await assertAdmin();
  await db.update(users).set({ isActive }).where(eq(users.id, id));

  // Re-fetch user to sync active status to staff record
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (user && user.staffId && user.departmentId) {
    await syncUserToStaff(db, {
      name: user.name,
      email: user.email,
      staffId: user.staffId,
      departmentId: user.departmentId,
      isActive,
    });
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/staff");
}

const updateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  staffId: z.string().optional().nullable(),
  role: z.enum(["SYSTEM_ADMIN", "HR", "GM", "DEPT_MANAGER", "GROUP_MANAGER"]),
  locationId: z.string().uuid().nullable(),
  departmentId: z.string().uuid().nullable(),
  hrLocationIds: z.string().optional().nullable(),
  gmLocationIds: z.string().optional().nullable(),
  groupManagerGroupIds: z.string().optional().nullable(),
  managerDepartmentIds: z.string().optional().nullable(),
});
export async function updateUser(formData: FormData) {
  await assertAdmin();

  const idVal = formData.get("id");
  const locationIdVal = formData.get("locationId");
  const departmentIdVal = formData.get("departmentId");

  const raw = {
    id: idVal ? (idVal as string) : null,
    name: formData.get("name"),
    email: formData.get("email"),
    staffId: (formData.get("staffId") as string | null) || null,
    role: formData.get("role"),
    locationId: locationIdVal && locationIdVal !== "" ? (locationIdVal as string) : null,
    departmentId: departmentIdVal && departmentIdVal !== "" ? (departmentIdVal as string) : null,
    hrLocationIds: formData.get("hrLocationIds") as string | null,
    gmLocationIds: formData.get("gmLocationIds") as string | null,
    groupManagerGroupIds: formData.get("groupManagerGroupIds") as string | null,
    managerDepartmentIds: formData.get("managerDepartmentIds") as string | null,
  };

  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fill in all required fields correctly." };
  }

  const {
    id,
    name,
    email,
    staffId,
    role,
    locationId,
    departmentId,
    hrLocationIds,
    gmLocationIds,
    groupManagerGroupIds,
    managerDepartmentIds,
  } = parsed.data;

  // Validate department assignment
  const deptIds: string[] = managerDepartmentIds ? JSON.parse(managerDepartmentIds) : [];
  if (role === "DEPT_MANAGER" && deptIds.length === 0 && !departmentId) {
    return { error: "At least one department must be assigned for Department Managers." };
  }

  // Check if email already used by someone else
  const existing = await db.query.users.findFirst({
    where: and(eq(users.email, email), not(eq(users.id, id))),
  });
  if (existing) return { error: "A user with this email already exists." };

  const current = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  // Handle staffId change/removal (deactivate old record if it changed)
  if (current && current.staffId && current.staffId !== staffId) {
    await db.update(staff).set({ isActive: false }).where(eq(staff.staffId, current.staffId));
  }

  const homeDeptId = departmentId || deptIds[0] || null;

  await db
    .update(users)
    .set({
      name,
      email,
      staffId: staffId || null,
      role,
      locationId: role === "GM" ? locationId : null,
      departmentId: homeDeptId, // Save primary/home department
    })
    .where(eq(users.id, id));

  // Sync to staff roster if staffId is present
  if (staffId && homeDeptId) {
    await syncUserToStaff(db, {
      name,
      email,
      staffId,
      departmentId: homeDeptId,
      isActive: current ? current.isActive : true,
    });
  }

  // Sync HR location mapping
  await db.delete(hrLocations).where(eq(hrLocations.hrUserId, id));
  if (role === "HR" && hrLocationIds) {
    const locIds: string[] = JSON.parse(hrLocationIds);
    if (locIds.length > 0) {
      await db.insert(hrLocations).values(
        locIds.map((lid) => ({ hrUserId: id, locationId: lid }))
      );
    }
  }

  // Sync GM location mapping
  await db.delete(gmLocations).where(eq(gmLocations.gmUserId, id));
  if (role === "GM" && gmLocationIds) {
    const locIds: string[] = JSON.parse(gmLocationIds);
    if (locIds.length > 0) {
      await db.insert(gmLocations).values(
        locIds.map((lid) => ({ gmUserId: id, locationId: lid }))
      );
    }
  }

  // Sync Group Manager group mapping
  await db.delete(groupManagersGroups).where(eq(groupManagersGroups.groupManagerId, id));
  if (role === "GROUP_MANAGER" && groupManagerGroupIds) {
    const grpIds: string[] = JSON.parse(groupManagerGroupIds);
    if (grpIds.length > 0) {
      await db.insert(groupManagersGroups).values(
        grpIds.map((gid) => ({ groupManagerId: id, groupId: gid }))
      );
    }
  }

  // Sync Department Manager department mapping
  await db.delete(managersDepartments).where(eq(managersDepartments.managerUserId, id));
  if (role === "DEPT_MANAGER" && deptIds.length > 0) {
    await db.insert(managersDepartments).values(
      deptIds.map((did) => ({ managerUserId: id, departmentId: did }))
    );
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function resendCredentials(userId: string) {
  await assertAdmin();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return { error: "User not found." };
  }

  const temporaryPassword = generatePassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId));

  try {
    await sendWelcomeEmail({
      to: user.email,
      name: user.name,
      email: user.email,
      temporaryPassword,
    });
  } catch (err) {
    console.error("Failed to send welcome/reset credentials email:", err);
    return { error: "Password was updated, but email delivery failed." };
  }

  revalidatePath("/dashboard/admin");
  return { success: true };
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export async function createGroup(formData: FormData) {
  await assertAdmin();
  const name = (formData.get("name") as string).trim();
  let code = (formData.get("code") as string)?.trim().toUpperCase() || "";
  const deptsJson = formData.get("assignedDepartmentIds") as string | null;
  const managersJson = formData.get("assignedManagerIds") as string | null;

  if (!name) return { error: "Name is required." };

  if (!code) {
    code = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length > 10) code = code.substring(0, 10);
    if (!code) code = "GRP-" + Math.floor(1000 + Math.random() * 9000);
  }

  // Verify unique group code
  const existing = await db.query.groups.findFirst({
    where: eq(groups.code, code),
  });
  if (existing) {
    return { error: `Group code "${code}" is already in use.` };
  }

  const [newGroup] = await db
    .insert(groups)
    .values({ name, code })
    .returning({ id: groups.id });

  // Handle department allocations
  if (deptsJson) {
    const deptIds: string[] = JSON.parse(deptsJson);
    if (deptIds.length > 0) {
      await db
        .update(departments)
        .set({ groupId: newGroup.id })
        .where(inArray(departments.id, deptIds));
    }
  }

  // Handle Group Manager allocations
  if (managersJson) {
    const managerIds: string[] = JSON.parse(managersJson);
    if (managerIds.length > 0) {
      await db.insert(groupManagersGroups).values(
        managerIds.map((mid) => ({ groupManagerId: mid, groupId: newGroup.id }))
      );
    }
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/departments");
  return { success: true };
}

export async function updateGroup(formData: FormData) {
  await assertAdmin();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string).trim();
  let code = (formData.get("code") as string)?.trim().toUpperCase() || "";
  const deptsJson = formData.get("assignedDepartmentIds") as string | null;
  const managersJson = formData.get("assignedManagerIds") as string | null;

  if (!name || !id) return { error: "ID and Name are required." };

  if (!code) {
    code = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length > 10) code = code.substring(0, 10);
    if (!code) code = "GRP-" + Math.floor(1000 + Math.random() * 9000);
  }

  // Verify uniqueness
  const existing = await db.query.groups.findFirst({
    where: and(eq(groups.code, code), not(eq(groups.id, id))),
  });
  if (existing) {
    return { error: `Group code "${code}" is already in use.` };
  }

  await db.update(groups).set({ name, code }).where(eq(groups.id, id));

  // Sync departments: unset previous, then set new
  await db
    .update(departments)
    .set({ groupId: null })
    .where(eq(departments.groupId, id));

  if (deptsJson) {
    const deptIds: string[] = JSON.parse(deptsJson);
    if (deptIds.length > 0) {
      await db
        .update(departments)
        .set({ groupId: id })
        .where(inArray(departments.id, deptIds));
    }
  }

  // Sync Group Managers: delete previous, insert new
  await db
    .delete(groupManagersGroups)
    .where(eq(groupManagersGroups.groupId, id));

  if (managersJson) {
    const managerIds: string[] = JSON.parse(managersJson);
    if (managerIds.length > 0) {
      await db.insert(groupManagersGroups).values(
        managerIds.map((mid) => ({ groupManagerId: mid, groupId: id }))
      );
    }
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/departments");
  return { success: true };
}

export async function toggleGroupActive(id: string, isActive: boolean) {
  await assertAdmin();
  await db.update(groups).set({ isActive }).where(eq(groups.id, id));
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function bulkCreateGroups(
  rows: { name: string; code?: string }[]
) {
  await assertAdmin();
  if (rows.length === 0) return { error: "No groups to create." };

  const allGrps = await db.select({ code: groups.code }).from(groups);
  const existingCodes = new Set(allGrps.map((g) => g.code.toUpperCase()));

  const toInsert: { name: string; code: string }[] = [];
  const codesInPayload = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const name = rows[i].name.trim();
    let code = rows[i].code?.trim().toUpperCase() || "";

    if (!name) continue; // Skip empty rows

    if (!code) {
      code = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length > 10) code = code.substring(0, 10);
      if (!code) code = "GRP-" + Math.floor(1000 + Math.random() * 9000);
    }

    if (existingCodes.has(code) || codesInPayload.has(code)) {
      return { error: `Group code "${code}" (Row ${i + 1}) is already in use.` };
    }

    codesInPayload.add(code);
    toInsert.push({ name, code });
  }

  if (toInsert.length === 0) {
    return { error: "Please enter details for at least one group." };
  }

  await db.insert(groups).values(toInsert).onConflictDoNothing({ target: groups.code });
  revalidatePath("/dashboard/admin");
  return { success: true, created: toInsert.length };
}
