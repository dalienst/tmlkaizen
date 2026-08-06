"use server";

import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function forgotPassword(formData: FormData) {
  const email = (formData.get("email") as string).trim().toLowerCase();

  if (!email) {
    return { error: "Email is required." };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !user.isActive) {
    // Return success to prevent enumeration, or return specific message since it is an internal system
    return { success: true };
  }

  // Generate token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  // Delete previous reset tokens
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

  // Insert token
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  // Send email
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  try {
    await sendPasswordResetEmail({
      to: email,
      name: user.name,
      resetUrl,
    });
  } catch (err) {
    console.error("Failed to send reset email:", err);
    return { error: "Failed to send reset email. Please try again later." };
  }

  return { success: true };
}

export async function resetPassword(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!token || !password || !confirm) {
    return { error: "All fields are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  // Verify token
  const resetRecord = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.token, token),
      gt(passwordResetTokens.expiresAt, new Date())
    ),
  });

  if (!resetRecord) {
    return { error: "Invalid or expired reset token." };
  }

  // Update password
  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, resetRecord.userId));

  // Clean up tokens
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, resetRecord.userId));

  return { success: true };
}
