import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import SetupForm from "./SetupForm";

export const metadata = {
  title: "Initial Setup | Kaizen Tracker",
};

export default async function SetupPage() {
  // If any admin already exists → redirect away
  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "SYSTEM_ADMIN"));

  if (Number(adminCount) > 0) {
    redirect("/login");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">Kaizen Tracker</div>
        <div
          className="auth-card__title"
          style={{ marginTop: "1.25rem", marginBottom: "0.25rem" }}
        >
          Create your admin account
        </div>
        <p className="auth-card__subtitle">
          This is a one-time setup. Once complete, this page will be
          permanently disabled.
        </p>
        <SetupForm />
      </div>
    </div>
  );
}
