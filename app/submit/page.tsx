import { db } from "@/db";
import { coreValues } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import SubmitFlow from "./SubmitFlow";
import Image from "next/image";

export const metadata = {
  title: "Submit Kaizen | Tamarind",
  description: "Submit a Kaizen (continuous improvement) idea for your department.",
};

export default async function SubmitPage() {
  const activeCoreValues = await db
    .select()
    .from(coreValues)
    .where(eq(coreValues.isActive, true))
    .orderBy(asc(coreValues.sortOrder));

  return (
    <div className="submit-page">
      <header className="submit-header">
        <Image
          src="/logo.png"
          alt="Tamarind logo"
          width={32}
          height={32}
          style={{ borderRadius: "var(--radius)", objectFit: "cover" }}
        />
        <span className="font-semibold" style={{ color: "var(--color-brand)", fontSize: "0.9375rem" }}>
          Kaizen Tracker
        </span>
        <span className="text-sub" style={{ marginLeft: "auto", fontSize: "0.8125rem" }}>
          Continuous Improvement
        </span>
      </header>
      <div className="submit-body">
        <SubmitFlow coreValues={activeCoreValues} />
      </div>
    </div>
  );
}
