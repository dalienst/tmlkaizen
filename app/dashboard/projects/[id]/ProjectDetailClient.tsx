"use client";

import { useState, useTransition } from "react";
import type { KaizenProject, Staff, Department, Location } from "@/db/schema";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { updateProjectStatus } from "@/actions/manager-actions";
import { PROJECT_STATUS_LABELS, formatDate } from "@/lib/constants";
import type { ProjectStatus } from "@/lib/constants";
import { toast } from "react-hot-toast";
import Image from "next/image";

type ProjectWithRelations = KaizenProject & {
  staff: Staff | null;
  department: Department & {
    location: Location;
  };
};

interface ProjectDetailClientProps {
  project: ProjectWithRelations;
  cvMap: Record<string, string>;
  canEdit: boolean;
}

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url);

const NEXT_STATUS: Record<ProjectStatus, ProjectStatus | null> = {
  PROPOSED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: null,
};

export default function ProjectDetailClient({
  project,
  cvMap,
  canEdit,
}: ProjectDetailClientProps) {
  const [status, setStatus] = useState<ProjectStatus>(project.status as ProjectStatus);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: ProjectStatus) => {
    startTransition(async () => {
      try {
        await updateProjectStatus(project.id, newStatus);
        setStatus(newStatus);
        toast.success(`Project marked as ${PROJECT_STATUS_LABELS[newStatus]}.`);
      } catch (err) {
        const error = err as Error;
        toast.error(error.message || "Failed to update project status.");
      }
    });
  };

  const next = NEXT_STATUS[status];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Info */}
      <div className="card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sub font-semibold" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            Kaizen Submission
          </div>
          <h1 className="font-semibold" style={{ fontSize: "1.25rem", margin: 0, color: "var(--color-text)" }}>
            {project.referenceNumber}
          </h1>
          <div className="text-muted" style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
            Submitted {formatDate(project.createdAt)}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          {canEdit && next && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={() => handleStatusChange(next)}
            >
              Mark as {PROJECT_STATUS_LABELS[next]}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6" style={{ alignItems: "start" }}>
        {/* Main Details (Col Span 2) */}
        <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div className="card p-5">
            <h2 className="font-semibold text-sub mb-3" style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Current Situation
            </h2>
            <p className="whitespace-pre-wrap" style={{ fontSize: "0.9375rem", lineHeight: 1.5 }}>
              {project.currentSituation}
            </p>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-sub mb-3" style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Improvement Idea
            </h2>
            <p className="whitespace-pre-wrap" style={{ fontSize: "0.9375rem", lineHeight: 1.5 }}>
              {project.improvementIdea}
            </p>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-sub mb-3" style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Expected Benefit
            </h2>
            <p className="whitespace-pre-wrap" style={{ fontSize: "0.9375rem", lineHeight: 1.5 }}>
              {project.expectedBenefit}
            </p>
          </div>

          {/* Attachments */}
          {project.imageUrls.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-sub mb-4" style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Attachments ({project.imageUrls.length})
              </h2>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {project.imageUrls.map((url, i) => {
                  const isImg = isImageUrl(url);
                  if (isImg) {
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <Image
                          src={url}
                          alt={`Attachment ${i + 1}`}
                          width={160}
                          height={120}
                          style={{ borderRadius: "var(--radius)", objectFit: "cover", border: "1px solid var(--color-border)" }}
                        />
                      </a>
                    );
                  }
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 border"
                      style={{
                        fontSize: "0.875rem",
                        borderColor: "var(--color-border)",
                        background: "var(--color-surface-2)",
                        textDecoration: "none",
                        color: "var(--color-text)",
                        borderRadius: "var(--radius)",
                        minWidth: "15rem",
                      }}
                    >
                      <span style={{ fontSize: "1.5rem" }}>📄</span>
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span className="font-semibold" style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>Attachment {i + 1}</span>
                        <span className="text-sub" style={{ fontSize: "0.75rem" }}>View / Download file</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info (Col Span 1) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Submitter Details */}
          <div className="card p-5">
            <h2 className="font-semibold text-sub mb-4" style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Submitted By
            </h2>
            {project.staff ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <div className="text-sub" style={{ fontSize: "0.75rem" }}>Full Name</div>
                  <div className="font-medium" style={{ fontSize: "0.875rem" }}>{project.staff.name}</div>
                </div>
                <div>
                  <div className="text-sub" style={{ fontSize: "0.75rem" }}>Staff ID</div>
                  <code style={{ fontSize: "0.8125rem", background: "var(--color-muted)", padding: "1px 6px", borderRadius: "3px" }}>
                    {project.staff.staffId}
                  </code>
                </div>
                <div>
                  <div className="text-sub" style={{ fontSize: "0.75rem" }}>Email Address</div>
                  <div className="text-sub" style={{ fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>{project.staff.email}</div>
                </div>
                <div>
                  <div className="text-sub" style={{ fontSize: "0.75rem" }}>Branch Location</div>
                  <div className="text-sub" style={{ fontSize: "0.875rem" }}>{project.department.location.name}</div>
                </div>
                <div>
                  <div className="text-sub" style={{ fontSize: "0.75rem" }}>Department</div>
                  <div className="text-sub" style={{ fontSize: "0.875rem" }}>{project.department.name}</div>
                </div>
              </div>
            ) : (
              <div className="text-muted" style={{ fontSize: "0.875rem" }}>Roster info unavailable</div>
            )}
          </div>

          {/* Core Values */}
          <div className="card p-5">
            <h2 className="font-semibold text-sub mb-3" style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Core Values Addressed
            </h2>
            <div className="flex gap-2 flex-wrap" style={{ marginTop: "0.5rem" }}>
              {project.coreValueIds.map((id) => (
                <Badge key={id} variant="brand">
                  {cvMap[id] ?? `Value #${id}`}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
