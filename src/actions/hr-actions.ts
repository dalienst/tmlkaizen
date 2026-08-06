"use server";

import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { z } from "zod";

async function assertHR() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "HR" && role !== "SYSTEM_ADMIN") throw new Error("Unauthorized");
}

const staffSchema = z.object({
  staffId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  departmentId: z.coerce.number(),
});

export async function addStaffMember(formData: FormData) {
  await assertHR();
  const raw = {
    staffId: formData.get("staffId"),
    name: formData.get("name"),
    email: formData.get("email"),
    departmentId: formData.get("departmentId"),
  };
  const parsed = staffSchema.safeParse(raw);
  if (!parsed.success) return { error: "Please fill in all fields correctly." };

  const { staffId, name, email, departmentId } = parsed.data;

  // Check duplicate staffId
  const existing = await db.query.staff.findFirst({
    where: eq(staff.staffId, staffId),
  });
  if (existing) return { error: `Staff ID "${staffId}" already exists.` };

  await db.insert(staff).values({ staffId, name, email, departmentId });
  revalidatePath("/dashboard/hr");
}

export async function updateStaffMember(formData: FormData) {
  await assertHR();
  const id = Number(formData.get("id"));
  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string).trim();
  if (!name || !email) return { error: "Name and email are required." };
  await db.update(staff).set({ name, email }).where(eq(staff.id, id));
  revalidatePath("/dashboard/hr");
}

export async function removeStaffMember(id: number) {
  await assertHR();
  await db.update(staff).set({ isActive: false }).where(eq(staff.id, id));
  revalidatePath("/dashboard/hr");
}

/** Bulk import staff from parsed CSV rows */
export async function bulkImportStaff(
  rows: { staffId: string; name: string; email: string; departmentId: number }[]
) {
  await assertHR();
  if (rows.length === 0) return { error: "No rows to import." };

  // Insert ignoring duplicates using onConflictDoNothing
  await db
    .insert(staff)
    .values(rows)
    .onConflictDoNothing({ target: staff.staffId });

  revalidatePath("/dashboard/hr");
  return { imported: rows.length };
}
