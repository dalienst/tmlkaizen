export const dynamic = 'force-dynamic';

import { db } from "@/db";
import { coreValues } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Kaizen Portal | Tamarind Group",
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
          src="/logo.png"
          alt="Tamarind logo"
          width={32}
          height={32}
          style={{ borderRadius: "var(--radius)", objectFit: "cover" }}
        />
        <span className="font-semibold" style={{ color: "var(--color-brand)", fontSize: "0.9375rem" }}>
          Kaizen Portal
        </span>
      </header>

      {/* Hero section */}
      <main style={{ flex: 1, padding: "2.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="submit-form-card" style={{ maxWidth: "46rem", padding: "2.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
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
            <div className="flex justify-center mt-6">
              <Link href="/submit" className="btn btn-primary" style={{ padding: "0.75rem 2rem", fontSize: "0.9375rem" }}>
                Submit a Kaizen Idea
              </Link>
            </div>
          </div>

          <div className="divider" />

          {/* GM's Policy Message */}
          <div style={{ marginBottom: "2.5rem" }}>
            <h2 className="font-semibold text-lg" style={{ marginBottom: "1rem", color: "var(--color-text)" }}>
              The Kaizen Philosophy at Tamarind
            </h2>
            
            <div className="card p-5" style={{ borderLeft: "4px solid var(--color-brand)", backgroundColor: "var(--color-surface-2)", marginBottom: "1.5rem" }}>
              <p style={{ fontStyle: "italic", fontSize: "0.875rem", lineHeight: 1.6, color: "var(--color-text-sub)" }}>
                "Kaizen is a continuous improvement approach centered on making small, consistent, and practical improvements in daily operations, efficiency, service delivery, teamwork, cost control, and overall workplace organization. The objective is to cultivate a culture where every team member actively contributes towards improving how we work and serve our guests."
              </p>
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column" }}>
                <span className="font-semibold" style={{ fontSize: "0.875rem", color: "var(--color-text)" }}>Joab Andayi</span>
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>General Manager — Tamarind Mombasa</span>
              </div>
            </div>

            <p className="text-sub" style={{ fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              This initiative is staff-centered and inclusive, giving every employee an opportunity to contribute ideas, creativity, and innovation within their respective areas. We encourage you to focus on:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))", gap: "1rem" }}>
              <div className="card p-4 flex flex-col gap-1">
                <span style={{ fontSize: "1.25rem" }}>💡</span>
                <div className="font-semibold" style={{ fontSize: "0.875rem", color: "var(--color-text)" }}>Propose Solutions</div>
                <p className="text-sub" style={{ fontSize: "0.8125rem", lineHeight: 1.4 }}>
                  Identify challenges and offer practical improvement ideas for your department.
                </p>
              </div>
              <div className="card p-4 flex flex-col gap-1">
                <span style={{ fontSize: "1.25rem" }}>⚡</span>
                <div className="font-semibold" style={{ fontSize: "0.875rem", color: "var(--color-text)" }}>Reduce Inefficiencies</div>
                <p className="text-sub" style={{ fontSize: "0.8125rem", lineHeight: 1.4 }}>
                  Examine daily operations to minimize wastage, delays, or recurring roadblocks.
                </p>
              </div>
              <div className="card p-4 flex flex-col gap-1">
                <span style={{ fontSize: "1.25rem" }}>🤝</span>
                <div className="font-semibold" style={{ fontSize: "0.875rem", color: "var(--color-text)" }}>Foster Teamwork</div>
                <p className="text-sub" style={{ fontSize: "0.8125rem", lineHeight: 1.4 }}>
                  Promote collaboration, innovation, and smarter ways of working together.
                </p>
              </div>
            </div>

            <div className="card p-4" style={{ marginTop: "1rem", textAlign: "center", backgroundColor: "var(--color-brand-50)", borderColor: "var(--color-brand-200)" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-brand)" }}>
                "Continuous improvement, innovation, ownership, and operational excellence."
              </p>
            </div>
          </div>

          <div className="divider" />

          {/* Core values list */}
          <div>
            <h2 className="font-semibold text-lg" style={{ marginBottom: "1rem", color: "var(--color-text)" }}>
              Our Core Focus Areas
            </h2>
            {activeCoreValues.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.8125rem" }}>
                No core values defined yet.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
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