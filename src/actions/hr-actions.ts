"use server";

import { db } from "@/db";
import { staff, departments } from "@/db/schema";
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
  departmentId: z.string().uuid(),
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
  revalidatePath("/dashboard/staff");
}

export async function updateStaffMember(formData: FormData) {
  await assertHR();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string).trim();
  const departmentId = formData.get("departmentId") as string;
  if (!name || !email || !id || !departmentId) return { error: "All fields are required." };
  await db.update(staff).set({ name, email, departmentId }).where(eq(staff.id, id));
  revalidatePath("/dashboard/hr");
  revalidatePath("/dashboard/staff");
}

export async function removeStaffMember(id: string) {
  await assertHR();
  await db.update(staff).set({ isActive: false }).where(eq(staff.id, id));
  revalidatePath("/dashboard/hr");
  revalidatePath("/dashboard/staff");
}

/** Bulk import staff from parsed CSV rows */
export async function bulkImportStaff(
  rows: { staffId: string; name: string; email: string; departmentCode: string }[]
) {
  await assertHR();
  if (rows.length === 0) return { error: "No rows to import." };

  // Fetch all departments to lookup UUIDs by their codes
  const allDepts = await db.select({ id: departments.id, code: departments.code }).from(departments);
  const codeMap = Object.fromEntries(allDepts.map((d) => [d.code.toUpperCase(), d.id]));

  // Fetch all existing staff to verify uniqueness
  const existingStaff = await db.select({ staffId: staff.staffId, email: staff.email }).from(staff);
  const existingStaffIds = new Set(existingStaff.map((s) => s.staffId.toUpperCase()));
  const existingEmails = new Set(existingStaff.map((s) => s.email.toLowerCase()));

  const toInsert: { staffId: string; name: string; email: string; departmentId: string }[] = [];
  const processedStaffIds = new Set<string>();
  const processedEmails = new Set<string>();

  let skippedDuplicates = 0;
  let skippedInvalidDepts = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sId = row.staffId.trim();
    const name = row.name.trim();
    const email = row.email.trim();
    const deptCode = row.departmentCode.trim().toUpperCase();

    if (!sId || !name || !email || !deptCode) {
      return { error: `Row ${i + 1} has empty values. Please fill in all columns.` };
    }

    const deptId = codeMap[deptCode];
    if (!deptId) {
      skippedInvalidDepts++;
      continue;
    }

    const sIdUpper = sId.toUpperCase();
    const emailLower = email.toLowerCase();

    if (
      existingStaffIds.has(sIdUpper) ||
      processedStaffIds.has(sIdUpper) ||
      existingEmails.has(emailLower) ||
      processedEmails.has(emailLower)
    ) {
      skippedDuplicates++;
      continue;
    }

    processedStaffIds.add(sIdUpper);
    processedEmails.add(emailLower);

    toInsert.push({
      staffId: sId,
      name,
      email,
      departmentId: deptId,
    });
  }

  if (toInsert.length === 0) {
    if (skippedInvalidDepts > 0) {
      return { error: "Failed to import. The department codes entered do not exist in the system." };
    }
    return { error: "Failed to import. All rows contain duplicate IDs/emails already registered in the system." };
  }

  await db.insert(staff).values(toInsert);

  revalidatePath("/dashboard/hr");
  revalidatePath("/dashboard/staff");

  let summary = `Imported ${toInsert.length} staff member(s).`;
  if (skippedDuplicates > 0 || skippedInvalidDepts > 0) {
    summary += ` Skipped: ${skippedDuplicates} duplicate(s) and ${skippedInvalidDepts} invalid department code(s).`;
  }
  return { success: true, message: summary, imported: toInsert.length };
}
