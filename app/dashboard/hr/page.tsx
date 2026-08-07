import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { staff, departments, hrLocations, locations } from "@/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import HRDashboardClient from "./HRDashboardClient";
import Link from "next/link";

export const metadata = { title: "HR Dashboard | Kaizen Tracker" };

export default async function HRPage() {
  const session = await auth();
  if (!session || (session.user.role !== "HR" && session.user.role !== "SYSTEM_ADMIN")) {
    redirect("/dashboard");
  }

  // Get locations this HR user is assigned to
  let assignedLocationIds: string[] = [];

  if (session.user.role === "SYSTEM_ADMIN") {
    const allLocs = await db.select({ id: locations.id }).from(locations);
    assignedLocationIds = allLocs.map((l) => l.id);
  } else {
    const hrLocs = await db
      .select({ locationId: hrLocations.locationId })
      .from(hrLocations)
      .where(eq(hrLocations.hrUserId, session.user.id as string));
    assignedLocationIds = hrLocs.map((r) => r.locationId);
  }

  const [allDepartments, allStaff, allLocations] = await Promise.all([
    assignedLocationIds.length > 0
      ? db
          .select()
          .from(departments)
          .where(inArray(departments.locationId, assignedLocationIds))
          .orderBy(asc(departments.name))
      : Promise.resolve([]),
    assignedLocationIds.length > 0
      ? db
          .select()
          .from(staff)
          .where(
            inArray(
              staff.departmentId,
              (await db
                .select({ id: departments.id })
                .from(departments)
                .where(inArray(departments.locationId, assignedLocationIds))
              ).map((d) => d.id)
            )
          )
          .orderBy(asc(staff.name))
      : Promise.resolve([]),
    db.select().from(locations).where(
      assignedLocationIds.length > 0
        ? inArray(locations.id, assignedLocationIds)
        : eq(locations.id, "00000000-0000-0000-0000-000000000000")
    ),
  ]);

  return (
    <div className="dashboard-main">
      <div className="dashboard-header">
        <h1 className="font-semibold" style={{ fontSize: "1rem" }}>
          Staff Roster
        </h1>
      </div>
      <div className="dashboard-content">
        {/* Quick nav cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { href: "/dashboard/departments", label: "Departments", desc: `${allDepartments.length} in your locations`, icon: "🏢" },
            { href: "/dashboard/analytics", label: "Analytics", desc: "Progress & stall detection", icon: "📊" },
            { href: "/dashboard/core-values", label: "Core Values", desc: "View value-linked ideas", icon: "★" },
          ].map((card) => (
            <Link key={card.href} href={card.href} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                <span style={{ fontSize: "1.25rem" }}>{card.icon}</span>
                <div>
                  <div className="font-semibold" style={{ fontSize: "0.875rem" }}>{card.label}</div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>{card.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <HRDashboardClient
          staff={allStaff}
          departments={allDepartments}
          locations={allLocations}
        />
      </div>
    </div>
  );
}
