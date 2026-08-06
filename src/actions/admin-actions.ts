"use server";

import { db } from "@/db";
import {
  locations,
  departments,
  users,
  hrLocations,
  coreValues,
} from "@/db/schema";
import { eq } from "drizzle-orm";
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
  if (!name) return { error: "Name is required." };
  await db.insert(locations).values({ name });
  revalidatePath("/dashboard/admin");
}

export async function updateLocation(formData: FormData) {
  await assertAdmin();
  const id = Number(formData.get("id"));
  const name = (formData.get("name") as string).trim();
  if (!name) return { error: "Name is required." };
  await db.update(locations).set({ name }).where(eq(locations.id, id));
  revalidatePath("/dashboard/admin");
}

export async function toggleLocationActive(id: number, isActive: boolean) {
  await assertAdmin();
  await db.update(locations).set({ isActive }).where(eq(locations.id, id));
  revalidatePath("/dashboard/admin");
}

// ─── Departments ───────────────────────────────────────────────────────────────

export async function createDepartment(formData: FormData) {
  await assertAdmin();
  const name = (formData.get("name") as string).trim();
  const locationId = Number(formData.get("locationId"));
  if (!name || !locationId) return { error: "Name and location are required." };
  await db.insert(departments).values({ name, locationId });
  revalidatePath("/dashboard/admin");
}

export async function updateDepartment(formData: FormData) {
  await assertAdmin();
  const id = Number(formData.get("id"));
  const name = (formData.get("name") as string).trim();
  if (!name) return { error: "Name is required." };
  await db.update(departments).set({ name }).where(eq(departments.id, id));
  revalidatePath("/dashboard/admin");
}

export async function toggleDepartmentActive(id: number, isActive: boolean) {
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
  const id = Number(formData.get("id"));
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!name) return { error: "Name is required." };
  await db
    .update(coreValues)
    .set({ name, description, sortOrder })
    .where(eq(coreValues.id, id));
  revalidatePath("/dashboard/admin");
}

export async function toggleCoreValueActive(id: number, isActive: boolean) {
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
  role: z.enum(["HR", "GM", "DEPT_MANAGER"]),
  locationId: z.number().nullable(),
  departmentId: z.number().nullable(),
  hrLocationIds: z.string().optional(), // JSON array of location IDs for HR
});

export async function createUser(formData: FormData) {
  await assertAdmin();

  const locationIdVal = formData.get("locationId");
  const departmentIdVal = formData.get("departmentId");

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    locationId: locationIdVal && locationIdVal !== "" ? Number(locationIdVal) : null,
    departmentId: departmentIdVal && departmentIdVal !== "" ? Number(departmentIdVal) : null,
    hrLocationIds: formData.get("hrLocationIds") as string | null,
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fill in all required fields correctly." };
  }

  const { name, email, role, locationId, departmentId, hrLocationIds } =
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
      passwordHash,
      role: role as UserRole,
      locationId: locationId ?? null,
      departmentId: departmentId ?? null,
    })
    .returning({ id: users.id });

  // For HR, insert hr_locations join rows
  if (role === "HR" && hrLocationIds) {
    const locIds: number[] = JSON.parse(hrLocationIds);
    if (locIds.length > 0) {
      await db.insert(hrLocations).values(
        locIds.map((lid) => ({ hrUserId: newUser.id, locationId: lid }))
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

export async function toggleUserActive(id: number, isActive: boolean) {
  await assertAdmin();
  await db.update(users).set({ isActive }).where(eq(users.id, id));
  revalidatePath("/dashboard/admin");
}

export async function updateUserRole(formData: FormData) {
  await assertAdmin();
  const id = Number(formData.get("id"));
  const role = formData.get("role") as UserRole;
  const locationId = formData.get("locationId")
    ? Number(formData.get("locationId"))
    : null;
  const departmentId = formData.get("departmentId")
    ? Number(formData.get("departmentId"))
    : null;
  await db
    .update(users)
    .set({ role, locationId, departmentId })
    .where(eq(users.id, id));
  revalidatePath("/dashboard/admin");
}

export async function resendCredentials(userId: number) {
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
