// Shared constants used across the app

export const USER_ROLES = {
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  HR: "HR",
  GM: "GM",
  DEPT_MANAGER: "DEPT_MANAGER",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const PROJECT_STATUSES = {
  PROPOSED: "PROPOSED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;

export type ProjectStatus =
  (typeof PROJECT_STATUSES)[keyof typeof PROJECT_STATUSES];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PROPOSED: "Proposed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SYSTEM_ADMIN: "System Admin",
  HR: "HR",
  GM: "General Manager",
  DEPT_MANAGER: "Department Manager",
};

/** Dashboard route for each role */
export const ROLE_DASHBOARD: Record<UserRole, string> = {
  SYSTEM_ADMIN: "/dashboard/admin",
  HR: "/dashboard/hr",
  GM: "/dashboard/gm",
  DEPT_MANAGER: "/dashboard/manager",
};

/** Max images per kaizen submission */
export const MAX_UPLOAD_FILES = 3;
export const MAX_FILE_SIZE_MB = 5;
