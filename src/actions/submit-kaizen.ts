"use server";

import { db } from "@/db";
import { kaizenProjects } from "@/db/schema";
import { count, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "fallback-dev-secret"
);

// ─── Step 1: Validate staff identity ──────────────────────────────────────────

export async function validateStaff(formData: FormData) {
  const staffId = (formData.get("staffId") as string).trim();
  const email = (formData.get("email") as string).trim().toLowerCase();

  if (!staffId || !email) {
    return { error: "Both Staff ID and email are required." };
  }

  const member = await db.query.staff.findFirst({
    where: (s, { and, eq }) =>
      and(eq(s.staffId, staffId), eq(s.email, email), eq(s.isActive, true)),
  });

  if (!member) {
    return { error: "No active staff member found with those details. Please check and try again." };
  }

  // Mint a signed JWT valid for 2 hours
  const token = await new SignJWT({ staffDbId: member.id, departmentId: member.departmentId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2h")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set("staff_session", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 2, // 2h
    path: "/",
  });

  return { success: true, staffName: member.name };
}

// ─── Step 2: Submit kaizen project ────────────────────────────────────────────

const submissionSchema = z.object({
  coreValueIds: z.array(z.string().uuid()).min(1, "Select at least one core value."),
  currentSituation: z.string().min(10, "Please describe the current situation."),
  improvementIdea: z.string().min(10, "Please describe your improvement idea."),
  expectedBenefit: z.string().min(10, "Please describe the expected benefit."),
  imageUrls: z.array(z.string().url()).max(3),
  status: z.enum(["PROPOSED", "IN_PROGRESS", "COMPLETED"]).optional().default("PROPOSED"),
});

async function generateReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const [{ value: countThisYear }] = await db
    .select({ value: count() })
    .from(kaizenProjects)
    .where(sql`EXTRACT(YEAR FROM ${kaizenProjects.createdAt}) = ${year}`);

  const seq = Number(countThisYear) + 1;
  return `KZN-${year}-${String(seq).padStart(4, "0")}`;
}

export async function submitKaizen(payload: {
  coreValueIds: string[];
  currentSituation: string;
  improvementIdea: string;
  expectedBenefit: string;
  imageUrls: string[];
  status?: string;
}) {
  // Verify staff session cookie
  const cookieStore = await cookies();
  const token = cookieStore.get("staff_session")?.value;
  if (!token) return { error: "Session expired. Please validate your identity again." };

  let staffDbId: string;
  let departmentId: string;

  try {
    const { payload: jwt } = await jwtVerify(token, SECRET);
    staffDbId = jwt.staffDbId as string;
    departmentId = jwt.departmentId as string;
  } catch {
    return { error: "Session expired. Please validate your identity again." };
  }

  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { coreValueIds, currentSituation, improvementIdea, expectedBenefit, imageUrls, status } =
    parsed.data;

  const referenceNumber = await generateReferenceNumber();

  await db.insert(kaizenProjects).values({
    referenceNumber,
    coreValueIds,
    currentSituation,
    improvementIdea,
    expectedBenefit,
    imageUrls,
    status: status || "PROPOSED",
    staffId: staffDbId,
    departmentId,
  });

  // Clear session cookie after successful submission
  cookieStore.delete("staff_session");

  return { success: true, referenceNumber };
}
