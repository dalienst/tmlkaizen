"use server";

import { db } from "@/db";
import {
  locations,
  departments,
  users,
  hrLocations,
  gmLocations,
  coreValues,
} from "@/db/schema";
import { eq, and, not } from "drizzle-orm";
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

// ─── Departments ───────────────────────────────────────────────────────────────

export async function createDepartment(formData: FormData) {
  await assertAdmin();
  const name = (formData.get("name") as string).trim();
  const locationId = formData.get("locationId") as string;
  let code = (formData.get("code") as string)?.trim().toUpperCase() || "";

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

  await db.insert(departments).values({ name, code, locationId });
  revalidatePath("/dashboard/admin");
}

export async function updateDepartment(formData: FormData) {
  await assertAdmin();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string).trim();
  let code = (formData.get("code") as string)?.trim().toUpperCase() || "";

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

  await db.update(departments).set({ name, code }).where(eq(departments.id, id));
  revalidatePath("/dashboard/admin");
}

export async function toggleDepartmentActive(id: string, isActive: boolean) {
  await assertAdmin();
  await db.update(departments).set({ isActive }).where(eq(departments.id, id));
  revalidatePath("/dashboard/admin");
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
  role: z.enum(["HR", "GM", "DEPT_MANAGER"]),
  locationId: z.string().uuid().nullable(),
  departmentId: z.string().uuid().nullable(),
  hrLocationIds: z.string().optional().nullable(), // JSON array of string UUIDs
  gmLocationIds: z.string().optional().nullable(), // JSON array of string UUIDs
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
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fill in all required fields correctly." };
  }

  const { name, email, staffId, role, locationId, departmentId, hrLocationIds, gmLocationIds } =
    parsed.data;

  // Check for existing email
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) return { error: "A user with this email already exists." };

  const temporaryPassword = generatePassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email,
      staffId: staffId || null,
      passwordHash,
      role: role as UserRole,
      locationId: locationId ?? null,
      departmentId: departmentId ?? null,
    })
    .returning({ id: users.id });

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

  // Send welcome email
  try {
    await sendWelcomeEmail({ to: email, name, email, temporaryPassword });
  } catch {
    // Don't fail the whole action if email fails
    console.error("Welcome email failed to send");
  }

  revalidatePath("/dashboard/admin");
}

export async function toggleUserActive(id: string, isActive: boolean) {
  await assertAdmin();
  await db.update(users).set({ isActive }).where(eq(users.id, id));
  revalidatePath("/dashboard/admin");
}

const updateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  staffId: z.string().optional().nullable(),
  role: z.enum(["HR", "GM", "DEPT_MANAGER"]),
  locationId: z.string().uuid().nullable(),
  departmentId: z.string().uuid().nullable(),
  hrLocationIds: z.string().optional().nullable(),
  gmLocationIds: z.string().optional().nullable(),
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
  };

  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fill in all required fields correctly." };
  }

  const { id, name, email, staffId, role, locationId, departmentId, hrLocationIds, gmLocationIds } =
    parsed.data;

  // Check if email already used by someone else
  const existing = await db.query.users.findFirst({
    where: and(eq(users.email, email), not(eq(users.id, id))),
  });
  if (existing) return { error: "A user with this email already exists." };

  await db
    .update(users)
    .set({
      name,
      email,
      staffId: staffId || null,
      role,
      locationId: role === "GM" ? locationId : null,
      departmentId: role === "DEPT_MANAGER" ? departmentId : null,
    })
    .where(eq(users.id, id));

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

  revalidatePath("/dashboard/admin");
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
