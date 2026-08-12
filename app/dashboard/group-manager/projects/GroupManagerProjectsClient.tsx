"use client";

import { useState } from "react";
import type { Department, CoreValue } from "@/db/schema";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { PROJECT_STATUS_LABELS, formatDate } from "@/lib/constants";
import type { ProjectStatus } from "@/lib/constants";
import Link from "next/link";

interface ProjectRow {
  id: string;
  referenceNumber: string;
  currentSituation: string;
  improvementIdea: string;
  expectedBenefit: string;
  status: ProjectStatus;
  createdAt: Date;
  coreValueIds: string[];
  staffName: string;
  staffId: string;
  deptName: string;
  deptId: string;
  locName: string;
}

interface GroupManagerProjectsClientProps {
  projects: ProjectRow[];
  departments: Department[];
  coreValues: CoreValue[];
}

const STATUS_FILTERS = ["ALL", "PROPOSED", "IN_PROGRESS", "COMPLETED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function GroupManagerProjectsClient({
  projects,
  departments,
  coreValues,
}: GroupManagerProjectsClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [deptFilter, setDeptFilter] = useState<string | "all">("all");

  const cvMap = Object.fromEntries(coreValues.map((cv) => [cv.id, cv.name]));

  const filtered = projects.filter((p) => {
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesDept = deptFilter === "all" || p.deptId === deptFilter;
    const matchesSearch =
      search === "" ||
      p.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.staffName.toLowerCase().includes(search.toLowerCase()) ||
      p.staffId.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesDept && matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Title */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="font-semibold" style={{ fontSize: "0.9375rem" }}>Projects Log</div>
          <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
            Viewing submitted ideas across your groups
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Search by ref number, submitter name or staff ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "24rem" }}
        />
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            style={{ width: "auto" }}
          >
            <option value="ALL">All statuses</option>
            {STATUS_FILTERS.filter(f => f !== "ALL").map((f) => (
              <option key={f} value={f}>
                {PROJECT_STATUS_LABELS[f as ProjectStatus]}
              </option>
            ))}
          </select>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Roster table */}
      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Ref Number</th>
              <th>Submitter</th>
              <th>Department</th>
              <th>Core Values</th>
              <th>Submitted</th>
              <th>Status</th>
              <th style={{ width: "6rem" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                  {search || statusFilter !== "ALL" || deptFilter !== "all"
                    ? "No projects match your filters."
                    : "No projects submitted yet."}
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <code style={{ fontSize: "0.8125rem", background: "var(--color-muted)", padding: "1px 6px", borderRadius: "3px" }}>
                    {p.referenceNumber}
                  </code>
                </td>
                <td>
                  <div className="font-medium">{p.staffName}</div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>{p.staffId}</div>
                </td>
                <td className="text-sub">
                  <div>{p.deptName}</div>
                  <div style={{ fontSize: "0.75rem" }}>{p.locName}</div>
                </td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {p.coreValueIds.slice(0, 2).map((id) => (
                      <Badge key={id} variant="brand">{cvMap[id] ?? id}</Badge>
                    ))}
                    {p.coreValueIds.length > 2 && (
                      <Badge variant="neutral">+{p.coreValueIds.length - 2}</Badge>
                    )}
                  </div>
                </td>
                <td className="text-sub">{formatDate(p.createdAt)}</td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td>
                  <Link href={`/dashboard/projects/${p.id}`} className="btn btn-sm btn-ghost">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
