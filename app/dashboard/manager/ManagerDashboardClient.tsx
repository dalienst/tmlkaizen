"use client";

import { useState, useTransition } from "react";
import type { KaizenProject, CoreValue } from "@/db/schema";
import { StatCard } from "@/components/ui/StatCard";
import { SlideOver } from "@/components/ui/SlideOver";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { updateProjectStatus } from "@/actions/manager-actions";
import type { ProjectStatus } from "@/lib/constants";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import Image from "next/image";

type ProjectRow = Omit<KaizenProject, "staffId"> & { staffName: string; staffId: string };

interface ManagerDashboardClientProps {
  projects: ProjectRow[];
  coreValues: CoreValue[];
  stats: {
    totalCount: number;
    proposedCount: number;
    inProgressCount: number;
    completedThisMonth: number;
  };
}

const STATUS_FILTERS = ["ALL", "PROPOSED", "IN_PROGRESS", "COMPLETED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function ManagerDashboardClient({
  projects,
  coreValues,
  stats,
}: ManagerDashboardClientProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProjectRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const cvMap = Object.fromEntries(coreValues.map((cv) => [cv.id, cv.name]));

  const filtered = projects.filter((p) => {
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesSearch =
      search === "" ||
      p.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.staffName.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function handleStatusChange(projectId: number, newStatus: ProjectStatus) {
    startTransition(async () => {
      await updateProjectStatus(projectId, newStatus);
      // Optimistically update selected
      if (selected?.id === projectId) {
        setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    });
  }

  const NEXT_STATUS: Record<ProjectStatus, ProjectStatus | null> = {
    PROPOSED: "IN_PROGRESS",
    IN_PROGRESS: "COMPLETED",
    COMPLETED: null,
  };

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total submissions" value={stats.totalCount} />
        <StatCard
          label="Proposed"
          value={stats.proposedCount}
          accentColor="var(--color-proposed)"
        />
        <StatCard
          label="In progress"
          value={stats.inProgressCount}
          accentColor="var(--color-inprogress)"
        />
        <StatCard
          label="Completed this month"
          value={stats.completedThisMonth}
          accentColor="var(--color-completed)"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="search"
          placeholder="Search by reference no. or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "20rem" }}
        />
        <div className="tab-strip" style={{ borderBottom: "none", marginBottom: 0, gap: "0.25rem" }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className={`tab-strip__item${statusFilter === f ? " active" : ""}`}
              onClick={() => setStatusFilter(f)}
              style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}
            >
              {f === "ALL" ? "All" : PROJECT_STATUS_LABELS[f as ProjectStatus]}
            </button>
          ))}
        </div>
        <span className="text-muted ml-auto" style={{ fontSize: "0.75rem" }}>
          {filtered.length} project{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Submitted by</th>
              <th>Core values</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                  {search || statusFilter !== "ALL"
                    ? "No projects match your filters."
                    : "No projects submitted yet."}
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelected(p)}
                style={{ cursor: "pointer" }}
              >
                <td>
                  <code style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-brand)" }}>
                    {p.referenceNumber}
                  </code>
                </td>
                <td>
                  <div className="font-medium">{p.staffName}</div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>{p.staffId}</div>
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
                <td className="text-sub" style={{ whiteSpace: "nowrap" }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Slide-over */}
      <SlideOver
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.referenceNumber ?? ""}
        footer={
          selected && NEXT_STATUS[selected.status] ? (
            <Button
              variant="primary"
              isLoading={isPending}
              onClick={() =>
                handleStatusChange(selected.id, NEXT_STATUS[selected.status]!)
              }
            >
              Mark as {PROJECT_STATUS_LABELS[NEXT_STATUS[selected.status]!]}
            </Button>
          ) : (
            <span className="badge badge-completed">Completed ✓</span>
          )
        }
      >
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status} />
              <span className="text-sub" style={{ fontSize: "0.8125rem" }}>
                Submitted {new Date(selected.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div>
              <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.375rem" }}>Submitted by</div>
              <div className="font-medium">{selected.staffName}</div>
              <div className="text-muted" style={{ fontSize: "0.8125rem" }}>{selected.staffId}</div>
            </div>

            <div>
              <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.375rem" }}>Core values addressed</div>
              <div className="flex gap-1 flex-wrap">
                {selected.coreValueIds.map((id) => (
                  <Badge key={id} variant="brand">{cvMap[id] ?? id}</Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.375rem" }}>Current situation</div>
              <p className="whitespace-pre-wrap" style={{ fontSize: "0.875rem" }}>{selected.currentSituation}</p>
            </div>

            <div>
              <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.375rem" }}>Improvement idea</div>
              <p className="whitespace-pre-wrap" style={{ fontSize: "0.875rem" }}>{selected.improvementIdea}</p>
            </div>

            <div>
              <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.375rem" }}>Expected benefit</div>
              <p className="whitespace-pre-wrap" style={{ fontSize: "0.875rem" }}>{selected.expectedBenefit}</p>
            </div>

            {selected.imageUrls.length > 0 && (
              <div>
                <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem" }}>
                  Attached photos ({selected.imageUrls.length})
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {selected.imageUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <Image
                        src={url}
                        alt={`Attachment ${i + 1}`}
                        width={120}
                        height={90}
                        style={{ borderRadius: "var(--radius)", objectFit: "cover", border: "1px solid var(--color-border)" }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
