import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import type { ProjectStatus } from "@/lib/constants";

type BadgeVariant = "proposed" | "inprogress" | "completed" | "neutral" | "brand";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()}>
      {children}
    </span>
  );
}

/** Maps a ProjectStatus enum value to the correct badge */
export function StatusBadge({ status }: { status: ProjectStatus }) {
  const variantMap: Record<ProjectStatus, BadgeVariant> = {
    PROPOSED: "proposed",
    IN_PROGRESS: "inprogress",
    COMPLETED: "completed",
  };
  return (
    <Badge variant={variantMap[status]}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
