"use client";

import { useState, useMemo } from "react";
import type { CoreValue, Department, Location } from "@/db/schema";
import type { ProjectStatus } from "@/lib/constants";
import { formatDate } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/Badge";
import Link from "next/link";

interface ProjectRow {
  project: {
    id: string;
    referenceNumber: string;
    coreValueIds: string[];
    currentSituation: string;
    improvementIdea: string;
    expectedBenefit: string;
    imageUrls: string[];
    status: ProjectStatus;
    staffId: string;
    departmentId: string;
    createdAt: Date;
    updatedAt: Date;
    startDate: Date | null;
    endDate: Date | null;
  };
  staffName: string | null;
  staffDbId: string | null;
  staffId: string | null;
  deptName: string | null;
}

interface AnalyticsClientProps {
  projects: ProjectRow[];
  departments: Department[];
  locations: Location[];
  coreValues: CoreValue[];
}

type TimeFilter = "all" | "month" | "quarter" | "last30" | "last90" | "custom";

export default function AnalyticsClient({
  projects,
  departments,
  locations,
  coreValues,
}: AnalyticsClientProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedDeptRank, setSelectedDeptRank] = useState("all");
  const [stalledSearch, setStalledSearch] = useState("");
  const [criticalStalledOnly, setCriticalStalledOnly] = useState(false);

  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const cvMap = useMemo(() => new Map(coreValues.map((cv) => [cv.id, cv.name])), [coreValues]);

  // ─── 1. Filter Projects by Time Period ──────────────────────────────────────
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Use startDate if populated, fallback to createdAt
      const refDate = p.project.startDate ? new Date(p.project.startDate) : new Date(p.project.createdAt);
      const now = new Date();

      switch (timeFilter) {
        case "month": {
          return (
            refDate.getFullYear() === now.getFullYear() &&
            refDate.getMonth() === now.getMonth()
          );
        }
        case "quarter": {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const projectQuarter = Math.floor(refDate.getMonth() / 3);
          return (
            refDate.getFullYear() === now.getFullYear() &&
            projectQuarter === currentQuarter
          );
        }
        case "last30": {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          return refDate >= thirtyDaysAgo;
        }
        case "last90": {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(now.getDate() - 90);
          return refDate >= ninetyDaysAgo;
        }
        case "custom": {
          if (!customStart || !customEnd) return true;
          const start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          return refDate >= start && refDate <= end;
        }
        case "all":
        default:
          return true;
      }
    });
  }, [projects, timeFilter, customStart, customEnd]);

  // ─── 2. Calculations ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredProjects.length;
    const proposed = filteredProjects.filter((p) => p.project.status === "PROPOSED").length;
    const inProgress = filteredProjects.filter((p) => p.project.status === "IN_PROGRESS").length;
    const completed = filteredProjects.filter((p) => p.project.status === "COMPLETED").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, proposed, inProgress, completed, completionRate };
  }, [filteredProjects]);

  // ─── 3. Leaderboards & Rankings ─────────────────────────────────────────────
  // Department rankings based on COMPLETED projects
  const departmentRankings = useMemo(() => {
    const map: Record<string, { id: string; name: string; total: number; completed: number; inProgress: number; rate: number }> = {};
    
    // Seed all departments to ensure empty ones are shown or at least mapped
    departments.forEach((d) => {
      map[d.id] = { id: d.id, name: d.name, total: 0, completed: 0, inProgress: 0, rate: 0 };
    });

    filteredProjects.forEach((p) => {
      const dId = p.project.departmentId;
      if (!map[dId]) {
        map[dId] = { id: dId, name: p.deptName || "Unknown", total: 0, completed: 0, inProgress: 0, rate: 0 };
      }
      map[dId].total++;
      if (p.project.status === "COMPLETED") {
        map[dId].completed++;
      } else if (p.project.status === "IN_PROGRESS") {
        map[dId].inProgress++;
      }
    });

    return Object.values(map)
      .map((d) => {
        d.rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
        return d;
      })
      .sort((a, b) => b.completed - a.completed || b.total - a.total);
  }, [filteredProjects, departments]);

  // Staff contributors rankings based on COMPLETED projects
  const staffRankings = useMemo(() => {
    const map: Record<string, { id: string; name: string; staffId: string; departmentId: string; deptName: string; total: number; completed: number }> = {};
    
    filteredProjects.forEach((p) => {
      const sId = p.project.staffId;
      if (!sId) return;
      if (!map[sId]) {
        map[sId] = {
          id: sId,
          name: p.staffName || "Unknown",
          staffId: p.staffId || "—",
          departmentId: p.project.departmentId,
          deptName: p.deptName || "—",
          total: 0,
          completed: 0,
        };
      }
      map[sId].total++;
      if (p.project.status === "COMPLETED") {
        map[sId].completed++;
      }
    });

    const list = Object.values(map);

    // Apply department filtering if requested
    const filteredList = selectedDeptRank === "all"
      ? list
      : list.filter((s) => s.departmentId === selectedDeptRank);

    return filteredList.sort((a, b) => b.completed - a.completed || b.total - a.total).slice(0, 10);
  }, [filteredProjects, selectedDeptRank]);

  // Core Value rankings based on Completed projects
  const coreValueRankings = useMemo(() => {
    const map: Record<string, { id: string; name: string; count: number }> = {};
    
    coreValues.forEach((cv) => {
      map[cv.id] = { id: cv.id, name: cv.name, count: 0 };
    });

    filteredProjects.forEach((p) => {
      if (p.project.status !== "COMPLETED") return;
      p.project.coreValueIds.forEach((cvId) => {
        if (map[cvId]) {
          map[cvId].count++;
        }
      });
    });

    const maxCount = Math.max(...Object.values(map).map((cv) => cv.count), 1);

    return Object.values(map)
      .map((cv) => ({ ...cv, percentage: Math.round((cv.count / maxCount) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredProjects, coreValues]);

  // ─── 4. Stalled Projects ───────────────────────────────────────────────────
  const stalledProjects = useMemo(() => {
    const thresholdDays = criticalStalledOnly ? 30 : 14;
    return filteredProjects
      .filter((p) => {
        if (p.project.status === "COMPLETED") return false;
        
        // Calculate days since last update
        const lastUpdated = new Date(p.project.updatedAt);
        const days = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
        if (days < thresholdDays) return false;

        // Apply search filter
        if (stalledSearch.trim()) {
          const s = stalledSearch.toLowerCase();
          const matchRef = p.project.referenceNumber.toLowerCase().includes(s);
          const matchStaff = p.staffName?.toLowerCase().includes(s);
          return matchRef || matchStaff;
        }

        return true;
      })
      .map((p) => {
        const lastUpdated = new Date(p.project.updatedAt);
        const days = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
        return { ...p, daysStalled: days };
      })
      .sort((a, b) => b.daysStalled - a.daysStalled);
  }, [filteredProjects, stalledSearch, criticalStalledOnly]);

  // ─── 5. SVG Pie/Donut Chart Calculations ────────────────────────────────────
  const donutData = useMemo(() => {
    const { proposed, inProgress, completed, total } = stats;
    if (total === 0) return null;

    const r = 50;
    const circ = 2 * Math.PI * r; // ~314.16

    const pPct = proposed / total;
    const ipPct = inProgress / total;
    const cPct = completed / total;

    const pOffset = circ;
    const ipOffset = circ - pPct * circ;
    const cOffset = circ - (pPct + ipPct) * circ;

    return {
      r,
      circ,
      pStroke: pPct * circ,
      ipStroke: ipPct * circ,
      cStroke: cPct * circ,
      pOffset,
      ipOffset,
      cOffset,
    };
  }, [stats]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ─── Controls & Filters ───────────────────────────────────────────────── */}
      <div className="card p-4 flex items-center justify-between gap-4 flex-wrap">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <label className="font-medium" style={{ fontSize: "0.875rem" }} htmlFor="time-range-select">
            Analyze Period:
          </label>
          <select
            id="time-range-select"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            style={{ width: "auto", minWidth: "10rem" }}
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last 90 Days</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {timeFilter === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              aria-label="Start date"
              style={{ width: "auto", padding: "0.375rem 0.5rem" }}
            />
            <span className="text-sub" style={{ fontSize: "0.8125rem" }}>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              aria-label="End date"
              style={{ width: "auto", padding: "0.375rem 0.5rem" }}
            />
          </div>
        )}
      </div>

      {/* ─── Metrics Stats Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Submissions", value: stats.total, color: "var(--color-brand)" },
          { label: "Proposed", value: stats.proposed, color: "var(--color-proposed)" },
          { label: "In Progress", value: stats.inProgress, color: "var(--color-inprogress)" },
          { label: "Completed", value: stats.completed, color: "var(--color-completed)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "1.25rem", borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 600, color }}>{value}</div>
            <div className="text-sub" style={{ fontSize: "0.8125rem" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ─── Graphical Data Section ───────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        {/* SVG Donut Chart (Status Distribution) */}
        <div className="col-span-4 card p-5 flex flex-col items-center justify-center" style={{ minHeight: "260px" }}>
          <div className="font-semibold text-sub mb-4 text-center" style={{ fontSize: "0.875rem", width: "100%" }}>
            STATUS DISTRIBUTION
          </div>

          {stats.total === 0 ? (
            <div className="text-muted text-center py-6" style={{ fontSize: "0.875rem" }}>No data in this period.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ position: "relative", width: "130px", height: "130px" }}>
                <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                  {donutData && (
                    <>
                      {/* Proposed (Blue) */}
                      <circle
                        cx="60"
                        cy="60"
                        r={donutData.r}
                        fill="transparent"
                        stroke="var(--color-proposed)"
                        strokeWidth="12"
                        strokeDasharray={donutData.circ}
                        strokeDashoffset={donutData.pOffset}
                        style={{ transition: "stroke-dashoffset 0.6s ease" }}
                      />
                      {/* In Progress (Amber) */}
                      <circle
                        cx="60"
                        cy="60"
                        r={donutData.r}
                        fill="transparent"
                        stroke="var(--color-inprogress)"
                        strokeWidth="12"
                        strokeDasharray={donutData.circ}
                        strokeDashoffset={donutData.ipOffset}
                        style={{ transition: "stroke-dashoffset 0.6s ease" }}
                      />
                      {/* Completed (Green) */}
                      <circle
                        cx="60"
                        cy="60"
                        r={donutData.r}
                        fill="transparent"
                        stroke="var(--color-completed)"
                        strokeWidth="12"
                        strokeDasharray={donutData.circ}
                        strokeDashoffset={donutData.cOffset}
                        style={{ transition: "stroke-dashoffset 0.6s ease" }}
                      />
                    </>
                  )}
                </svg>
                {/* Center Label */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <span className="font-semibold text-lg" style={{ color: "var(--color-completed)", lineHeight: 1 }}>
                    {stats.completionRate}%
                  </span>
                  <span className="text-muted" style={{ fontSize: "0.6875rem", marginTop: "2px" }}>Completed</span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", fontSize: "0.8125rem" }}>
                <div className="flex items-center gap-2">
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--color-proposed)" }} />
                  <span className="text-sub">Proposed ({Math.round((stats.proposed / stats.total) * 100)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--color-inprogress)" }} />
                  <span className="text-sub">In Progress ({Math.round((stats.inProgress / stats.total) * 100)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--color-completed)" }} />
                  <span className="text-sub">Completed ({stats.completionRate}%)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SVG Department Stacked Bar Chart */}
        <div className="col-span-8 card p-5" style={{ minHeight: "260px" }}>
          <div className="font-semibold text-sub mb-4" style={{ fontSize: "0.875rem" }}>
            DEPARTMENT PERFORMANCE STACK
          </div>

          {departmentRankings.length === 0 ? (
            <div className="text-muted text-center py-6" style={{ fontSize: "0.875rem" }}>No data in this period.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", maxHeight: "200px", overflowY: "auto", paddingRight: "0.25rem" }}>
              {departmentRankings.slice(0, 6).map((d) => {
                const pPct = d.total > 0 ? (d.total - d.completed - d.inProgress) / d.total * 100 : 0;
                const ipPct = d.total > 0 ? d.inProgress / d.total * 100 : 0;
                const cPct = d.total > 0 ? d.completed / d.total * 100 : 0;

                return (
                  <div key={d.id}>
                    <div className="flex items-center justify-between mb-1" style={{ fontSize: "0.8125rem" }}>
                      <span className="font-medium">{d.name}</span>
                      <span className="text-sub">
                        {d.completed}/{d.total} completed ({d.rate}%)
                      </span>
                    </div>
                    {d.total > 0 ? (
                      <div className="flex" style={{ height: "8px", background: "var(--color-muted)", borderRadius: "4px", overflow: "hidden" }}>
                        {cPct > 0 && <div style={{ width: `${cPct}%`, background: "var(--color-completed)", height: "100%" }} />}
                        {ipPct > 0 && <div style={{ width: `${ipPct}%`, background: "var(--color-inprogress)", height: "100%" }} />}
                        {pPct > 0 && <div style={{ width: `${pPct}%`, background: "var(--color-proposed)", height: "100%" }} />}
                      </div>
                    ) : (
                      <div style={{ height: "8px", background: "var(--color-muted)", borderRadius: "4px" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Rankings & Leaderboards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        {/* Department Leaderboard */}
        <div className="col-span-6 card overflow-hidden">
          <div className="p-4 font-semibold border-b flex justify-between items-center" style={{ fontSize: "0.875rem", borderColor: "var(--color-border)" }}>
            <span>Department Leaderboard</span>
            <span className="text-xs text-muted" style={{ fontWeight: 400 }}>Sorted by Completed</span>
          </div>
          {departmentRankings.length === 0 ? (
            <div className="p-4 text-center text-muted" style={{ fontSize: "0.875rem" }}>No data.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: "3rem" }}>Rank</th>
                  <th>Department</th>
                  <th>Total</th>
                  <th>Completed</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {departmentRankings.slice(0, 5).map((d, index) => (
                  <tr key={d.id}>
                    <td className="text-muted" style={{ fontSize: "0.8125rem" }}>#{index + 1}</td>
                    <td className="font-medium">
                      <Link href={`/dashboard/departments/${d.id}`} style={{ textDecoration: "none", color: "var(--color-brand)" }}>
                        {d.name}
                      </Link>
                    </td>
                    <td><span className="badge badge-brand">{d.total}</span></td>
                    <td><span className="badge badge-completed">{d.completed}</span></td>
                    <td className="font-medium" style={{ color: d.rate >= 70 ? "var(--color-completed)" : undefined }}>
                      {d.rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Staff Contributor Leaderboard */}
        <div className="col-span-6 card overflow-hidden">
          <div className="p-4 font-semibold border-b flex justify-between items-center flex-wrap gap-2" style={{ fontSize: "0.875rem", borderColor: "var(--color-border)" }}>
            <span>Top Contributors</span>
            <select
              value={selectedDeptRank}
              onChange={(e) => setSelectedDeptRank(e.target.value)}
              style={{ width: "auto", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
              aria-label="Filter leaderboard by department"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {staffRankings.length === 0 ? (
            <div className="p-4 text-center text-muted" style={{ fontSize: "0.875rem" }}>No staff contributions matching filters.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: "3rem" }}>#</th>
                  <th>Staff</th>
                  <th>Department</th>
                  <th>Total</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {staffRankings.slice(0, 5).map((s, index) => (
                  <tr key={s.id}>
                    <td className="text-muted" style={{ fontSize: "0.8125rem" }}>{index + 1}</td>
                    <td className="font-medium">
                      <Link href={`/dashboard/staff/${s.id}`} style={{ textDecoration: "none", color: "var(--color-brand)" }}>
                        {s.name}
                      </Link>
                    </td>
                    <td className="text-sub">{s.deptName}</td>
                    <td><span className="badge badge-brand">{s.total}</span></td>
                    <td><span className="badge badge-completed">{s.completed}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Core Values & Stalled Projects ────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        {/* Core Values Ranking */}
        <div className="col-span-5 card p-5 flex flex-col">
          <div className="font-semibold text-sub mb-4" style={{ fontSize: "0.875rem" }}>
            CORE VALUES DRIVING KAIZENS
          </div>
          {coreValueRankings.length === 0 ? (
            <div className="text-muted text-center py-6" style={{ fontSize: "0.875rem" }}>No completed projects.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1, maxHeight: "300px", overflowY: "auto", paddingRight: "0.25rem" }}>
              {coreValueRankings.map((cv) => (
                <div key={cv.id}>
                  <div className="flex items-center justify-between mb-1" style={{ fontSize: "0.8125rem" }}>
                    <span className="font-medium text-sub">{cv.name}</span>
                    <span className="font-semibold">{cv.count} done</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--color-muted)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      width: `${cv.percentage}%`,
                      height: "100%",
                      background: "var(--color-brand)",
                      borderRadius: "3px",
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stalled Projects list */}
        <div className="col-span-7 card flex flex-col overflow-hidden">
          <div className="p-4 font-semibold border-b flex justify-between items-center flex-wrap gap-2" style={{ fontSize: "0.875rem", borderColor: "var(--color-border)", minHeight: "53px" }}>
            <div className="flex items-center gap-2">
              <span>Stalled Projects</span>
              {stalledProjects.length > 0 && (
                <span className="badge badge-inprogress" style={{ fontSize: "0.6875rem" }}>{stalledProjects.length} stalled</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input
                type="text"
                placeholder="Search..."
                value={stalledSearch}
                onChange={(e) => setStalledSearch(e.target.value)}
                style={{ width: "auto", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                aria-label="Search stalled projects"
              />
              <label className="flex items-center gap-1.5" style={{ fontSize: "0.75rem", cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={criticalStalledOnly}
                  onChange={(e) => setCriticalStalledOnly(e.target.checked)}
                />
                Critical (&gt;30d)
              </label>
            </div>
          </div>

          <div style={{ flex: 1, maxHeight: "300px", overflowY: "auto" }}>
            {stalledProjects.length === 0 ? (
              <div className="p-8 text-center text-muted" style={{ fontSize: "0.875rem" }}>
                {stalledSearch
                  ? "No stalled projects match your search."
                  : "✓ All projects are active and moving forward."}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Staff</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Stalled</th>
                    <th style={{ width: "5rem" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stalledProjects.map((s) => (
                    <tr key={s.project.id} style={{ background: s.daysStalled >= 30 ? "rgba(239, 68, 68, 0.05)" : undefined }}>
                      <td>
                        <code style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                          {s.project.referenceNumber}
                        </code>
                      </td>
                      <td className="font-medium">{s.staffName}</td>
                      <td className="text-sub">{s.deptName}</td>
                      <td><StatusBadge status={s.project.status} /></td>
                      <td className="text-sub">{formatDate(s.project.updatedAt)}</td>
                      <td>
                        <span style={{
                          fontWeight: 600,
                          color: s.daysStalled >= 30 ? "var(--color-danger)" : "var(--color-warning)",
                        }}>
                          {s.daysStalled}d
                        </span>
                      </td>
                      <td>
                        <Link href={`/dashboard/projects/${s.project.id}`} className="btn btn-ghost btn-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
