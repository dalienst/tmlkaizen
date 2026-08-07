"use client";

import { useTransition } from "react";
import { updateProjectStatus } from "@/actions/manager-actions";
import { toast } from "react-hot-toast";
import type { ProjectStatus } from "@/lib/constants";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";

const TRANSITIONS: Record<ProjectStatus, ProjectStatus | null> = {
  PROPOSED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: null,
};

const NEXT_LABELS: Record<ProjectStatus, string> = {
  PROPOSED: "Mark In Progress",
  IN_PROGRESS: "Mark Completed",
  COMPLETED: "",
};

interface Props {
  projectId: string;
  currentStatus: ProjectStatus;
}

export default function ProjectStatusForm({ projectId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const nextStatus = TRANSITIONS[currentStatus];

  if (!nextStatus) return null;

  function handleAdvance() {
    startTransition(async () => {
      try {
        await updateProjectStatus(projectId, nextStatus!);
        toast.success(`Status updated to ${PROJECT_STATUS_LABELS[nextStatus!]}`);
      } catch {
        toast.error("Failed to update status. Please try again.");
      }
    });
  }

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={handleAdvance}
      disabled={isPending}
      style={{ whiteSpace: "nowrap" }}
    >
      {isPending ? "Saving…" : NEXT_LABELS[currentStatus]}
    </button>
  );
}
