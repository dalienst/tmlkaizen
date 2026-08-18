"use client";

import { useState } from "react";
import type { Location } from "@/db/schema";
import Link from "next/link";

interface LocationsDashboardClientProps {
  locations: Location[];
  deptCounts: Record<string, number>;
  staffCounts: Record<string, number>;
  projectCounts: Record<string, number>;
}

export default function LocationsDashboardClient({
  locations,
  deptCounts,
  staffCounts,
  projectCounts,
}: LocationsDashboardClientProps) {
  const [search, setSearch] = useState("");

  const filtered = locations.filter((l) => {
    const query = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(query) ||
      (l.code && l.code.toLowerCase().includes(query))
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div style={{ display: "flex", gap: "0.75rem", flex: 1, maxWidth: "30rem" }}>
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: "0.875rem" }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
          No locations found matching the criteria.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((loc) => {
            const depts = deptCounts[loc.id] ?? 0;
            const staff = staffCounts[loc.id] ?? 0;
            const projects = projectCounts[loc.id] ?? 0;
            return (
              <div
                key={loc.id}
                className="card"
                style={{
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <Link
                  href={`/dashboard/locations/${loc.id}`}
                  style={{
                    textDecoration: "none",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    minWidth: 0,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-semibold" style={{ marginBottom: "0.125rem", color: "var(--color-text-main)" }}>
                      {loc.name}{" "}
                      {loc.code && (
                        <code className="text-muted" style={{ fontSize: "0.75rem", fontWeight: "normal" }}>
                          ({loc.code})
                        </code>
                      )}
                    </div>
                    <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
                      <span className={`badge ${loc.isActive ? "badge-completed" : "badge-neutral"}`} style={{ padding: "0.1rem 0.4rem", fontSize: "0.7rem" }}>
                        {loc.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "2rem", alignItems: "center", marginRight: "1rem" }}>
                    <div style={{ textAlign: "center", minWidth: "4.5rem" }}>
                      <div className="font-semibold" style={{ color: "var(--color-brand)" }}>{depts}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>Departments</div>
                    </div>
                    <div style={{ textAlign: "center", minWidth: "3.5rem" }}>
                      <div className="font-semibold" style={{ color: "var(--color-brand)" }}>{staff}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>Staff</div>
                    </div>
                    <div style={{ textAlign: "center", minWidth: "4.5rem" }}>
                      <div className="font-semibold" style={{ color: "var(--color-brand)" }}>{projects}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>Kaizens</div>
                    </div>
                  </div>
                </Link>

                <Link
                  href={`/dashboard/locations/${loc.id}`}
                  style={{
                    textDecoration: "none",
                    color: "var(--color-text-muted)",
                    fontSize: "0.875rem",
                    marginLeft: "0.5rem",
                  }}
                >
                  →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
