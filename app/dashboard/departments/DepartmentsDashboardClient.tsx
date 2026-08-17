"use client";

import { useState, useTransition } from "react";
import type { Department, Location } from "@/db/schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  createDepartment,
  updateDepartment,
  toggleDepartmentActive,
} from "@/actions/admin-actions";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface DepartmentsDashboardClientProps {
  initialDepartments: Department[];
  locations: Location[];
  staffCounts: Record<string, number>;
  projectCounts: Record<string, number>;
  userRole: string;
  assignedLocationIds: string[];
}

export default function DepartmentsDashboardClient({
  initialDepartments,
  locations,
  staffCounts,
  projectCounts,
  userRole,
  assignedLocationIds,
}: DepartmentsDashboardClientProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [search, setSearch] = useState("");
  const [filterLocationId, setFilterLocationId] = useState<string | "all">("all");
  const [isPending, startTransition] = useTransition();

  const isManager = userRole === "SYSTEM_ADMIN" || userRole === "HR";

  // Filter locations to show in dropdown/filter based on assignment
  const allowedLocations = locations.filter((l) =>
    userRole === "SYSTEM_ADMIN" ? l.isActive : l.isActive && assignedLocationIds.includes(l.id)
  );

  const filtered = initialDepartments.filter((d) => {
    const matchesSearch =
      search === "" ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase());
    const matchesLocation =
      filterLocationId === "all" || d.locationId === filterLocationId;
    return matchesSearch && matchesLocation;
  });

  const locationName = (id: string) =>
    locations.find((l) => l.id === id)?.name ?? "—";

  function handleToggle(dept: Department) {
    startTransition(async () => {
      const res = await toggleDepartmentActive(dept.id, !dept.isActive);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Department ${dept.isActive ? "deactivated" : "activated"} successfully.`);
      }
    });
  }

  async function handleCreate(fd: FormData) {
    startTransition(async () => {
      const res = await createDepartment(fd);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setCreateOpen(false);
        toast.success("Department created successfully.");
      }
    });
  }

  async function handleEdit(fd: FormData) {
    startTransition(async () => {
      const res = await updateDepartment(fd);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setEditTarget(null);
        toast.success("Department updated successfully.");
      }
    });
  }

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
          <select
            value={filterLocationId}
            onChange={(e) => setFilterLocationId(e.target.value)}
            style={{ width: "auto", fontSize: "0.875rem" }}
          >
            <option value="all">All Locations</option>
            {allowedLocations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {isManager && (
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            + Add department
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
          No departments found matching the criteria.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((dept) => {
            const locName = locationName(dept.locationId);
            const staffCount = staffCounts[dept.id] ?? 0;
            const projectCount = projectCounts[dept.id] ?? 0;
            return (
              <div
                key={dept.id}
                className="card"
                style={{
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <Link
                  href={`/dashboard/departments/${dept.id}`}
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
                      {dept.name}{" "}
                      <code className="text-muted" style={{ fontSize: "0.75rem", fontWeight: "normal" }}>
                        ({dept.code})
                      </code>
                    </div>
                    <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
                      {locName} · <span className={`badge ${dept.isActive ? "badge-completed" : "badge-neutral"}`} style={{ padding: "0.1rem 0.4rem", fontSize: "0.7rem" }}>{dept.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", marginRight: "1rem" }}>
                    <div style={{ textAlign: "center" }}>
                      <div className="font-semibold" style={{ color: "var(--color-brand)" }}>{staffCount}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>Staff</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div className="font-semibold" style={{ color: "var(--color-brand)" }}>{projectCount}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>Kaizens</div>
                    </div>
                  </div>
                </Link>

                {isManager && (
                  <div style={{ display: "flex", gap: "0.5rem" }} onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => setEditTarget(dept)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={dept.isActive ? "danger" : "secondary"}
                      isLoading={isPending && editTarget?.id !== dept.id}
                      onClick={() => handleToggle(dept)}
                    >
                      {dept.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                )}

                <Link
                  href={`/dashboard/departments/${dept.id}`}
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

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        title="Add department"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="create-dept-dashboard-form" isLoading={isPending}>Save</Button>
          </>
        }
      >
        <form
          id="create-dept-dashboard-form"
          action={handleCreate}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div className="field">
            <label htmlFor="dept-dashboard-name">Department name</label>
            <input id="dept-dashboard-name" name="name" type="text" placeholder="e.g. Kitchen" required />
          </div>
          <div className="field">
            <label htmlFor="dept-dashboard-code">Department code <span className="text-muted">(optional, e.g. KIT)</span></label>
            <input id="dept-dashboard-code" name="code" type="text" placeholder="Auto-generated if left blank" style={{ textTransform: "uppercase" }} />
          </div>
          <div className="field">
            <label htmlFor="dept-dashboard-location">Location</label>
            <select id="dept-dashboard-location" name="locationId" required>
              <option value="">Select location…</option>
              {allowedLocations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit department"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="edit-dept-dashboard-form"
              isLoading={isPending}
            >
              Save changes
            </Button>
          </>
        }
      >
        {editTarget && (
          <form
            id="edit-dept-dashboard-form"
            action={handleEdit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <input type="hidden" name="id" value={editTarget.id} />
            <div className="field">
              <label htmlFor="dept-dashboard-edit-name">Department name</label>
              <input id="dept-dashboard-edit-name" name="name" type="text" defaultValue={editTarget.name} required />
            </div>
            <div className="field">
              <label htmlFor="dept-dashboard-edit-code">Department code</label>
              <input id="dept-dashboard-edit-code" name="code" type="text" defaultValue={editTarget.code} required style={{ textTransform: "uppercase" }} />
            </div>
            <div className="field">
              <label htmlFor="dept-dashboard-edit-location">Location</label>
              <select id="dept-dashboard-edit-location" name="locationId" defaultValue={editTarget.locationId} required>
                <option value="">Select location…</option>
                {allowedLocations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
                {!allowedLocations.some((l) => l.id === editTarget.locationId) && (() => {
                  const currentLoc = locations.find((l) => l.id === editTarget.locationId);
                  return currentLoc ? (
                    <option key={currentLoc.id} value={currentLoc.id}>
                      {currentLoc.name}
                    </option>
                  ) : null;
                })()}
              </select>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
