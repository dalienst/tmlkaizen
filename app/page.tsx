import { db } from "@/db";
import { coreValues } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Kaizen Portal | Tamarind",
  description: "Continuous improvement platform at Tamarind branches.",
};

export default async function Home() {
  const activeCoreValues = await db
    .select()
    .from(coreValues)
    .where(eq(coreValues.isActive, true))
    .orderBy(asc(coreValues.sortOrder));

  return (
    <div className="submit-page">
      {/* Header */}
      <header className="submit-header">
        <Image
          src="/logo.jpg"
          alt="Tamarind logo"
          width={32}
          height={32}
          style={{ borderRadius: "var(--radius)", objectFit: "cover" }}
        />
        <span className="font-semibold" style={{ color: "var(--color-brand)", fontSize: "0.9375rem" }}>
          Kaizen Portal
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            Management Portal
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main style={{ flex: 1, padding: "2.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="submit-form-card" style={{ maxWidth: "42rem", padding: "2.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <span
              className="badge badge-brand"
              style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              Continuous Improvement
            </span>
            <h1 className="font-semibold text-xl" style={{ marginTop: "1rem", color: "var(--color-text)", lineHeight: 1.2 }}>
              Empowering Better Ideas, Every Day
            </h1>
            <p className="text-sub mt-4" style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
              Kaizen is a philosophy of continuous improvement. By proposing small, daily, incremental changes, we collectively foster a safer, more efficient, and more productive workplace at Tamarind.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <Link href="/submit" className="btn btn-primary">
                Submit a Kaizen Idea
              </Link>
              <Link href="/dashboard" className="btn btn-secondary">
                Go to Dashboard
              </Link>
            </div>
          </div>

          <div className="divider" />

          {/* Core values list */}
          <div>
            <h2 className="font-semibold text-lg" style={{ marginBottom: "1rem", color: "var(--color-text)" }}>
              Our Core Values
            </h2>
            {activeCoreValues.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.8125rem" }}>
                No core values defined yet. Administrator will set them up.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {activeCoreValues.map((cv) => (
                  <div key={cv.id} className="card p-4 flex flex-col gap-1">
                    <div className="font-semibold text-base" style={{ color: "var(--color-brand)" }}>
                      {cv.name}
                    </div>
                    {cv.description && (
                      <p className="text-sub" style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
                        {cv.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--color-border)", padding: "1rem", textAlign: "center" }}>
        <p className="text-muted" style={{ fontSize: "0.75rem" }}>
          &copy; {new Date().getFullYear()} Tamarind Group. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
