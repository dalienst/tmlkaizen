"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function registerFirstAdmin(
  _prevState: { error: string },
  formData: FormData
) {
  // Guard: only runs if no admin exists
  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "SYSTEM_ADMIN"));

  if (Number(adminCount) > 0) {
    redirect("/login");
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!name || !email || !password) {
    return { error: "All fields are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    name,
    email,
    passwordHash,
    role: "SYSTEM_ADMIN",
    locationId: null,
    departmentId: null,
  });

  redirect("/login?setup=complete");
}
