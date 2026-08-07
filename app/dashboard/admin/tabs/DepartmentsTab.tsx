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

interface DepartmentsTabProps {
  departments: Department[];
  locations: Location[];
}

export default function DepartmentsTab({
  departments,
  locations,
}: DepartmentsTabProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [filterLocationId, setFilterLocationId] = useState<string | "all">("all");
  const [isPending, startTransition] = useTransition();

  const filtered =
    filterLocationId === "all"
      ? departments
      : departments.filter((d) => d.locationId === filterLocationId);

  const locationName = (id: string) =>
    locations.find((l) => l.id === id)?.name ?? "—";

  function handleToggle(dept: Department) {
    startTransition(async () => {
      await toggleDepartmentActive(dept.id, !dept.isActive);
      toast.success(`Department ${dept.isActive ? "deactivated" : "activated"} successfully.`);
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold" style={{ fontSize: "0.9375rem" }}>Departments</div>
          <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
            Operational units within branches
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          + Add department
        </Button>
      </div>

      {/* Filter */}
      <div className="flex mb-4">
        <select
          value={filterLocationId}
          onChange={(e) => setFilterLocationId(e.target.value)}
          style={{ width: "auto" }}
        >
          <option value="all">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Location</th>
              <th>Status</th>
              <th style={{ width: "8rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                  No departments found.
                </td>
              </tr>
            )}
            {filtered.map((dept) => (
              <tr
                key={dept.id}
                onClick={() => setEditTarget(dept)}
                style={{ cursor: "pointer" }}
              >
                <td className="font-medium">{dept.name}</td>
                <td><code style={{ fontSize: "0.8125rem" }}>{dept.code}</code></td>
                <td className="text-sub">{locationName(dept.locationId)}</td>
                <td>
                  <span
                    className={`badge ${dept.isActive ? "badge-completed" : "badge-neutral"}`}
                  >
                    {dept.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        title="Add department"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="create-dept-form" isLoading={isPending}>Save</Button>
          </>
        }
      >
        <form
          id="create-dept-form"
          action={handleCreate}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div className="field">
            <label htmlFor="dept-name">Department name</label>
            <input id="dept-name" name="name" type="text" placeholder="e.g. Kitchen" required />
          </div>
          <div className="field">
            <label htmlFor="dept-code">Department code <span className="text-muted">(optional, e.g. KIT)</span></label>
            <input id="dept-code" name="code" type="text" placeholder="Auto-generated if left blank" style={{ textTransform: "uppercase" }} />
          </div>
          <div className="field">
            <label htmlFor="dept-location">Location</label>
            <select id="dept-location" name="locationId" required>
              <option value="">Select location…</option>
              {locations.filter((l) => l.isActive).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit */}
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
              form="edit-dept-form"
              isLoading={isPending}
            >
              Save changes
            </Button>
          </>
        }
      >
        {editTarget && (
          <form
            id="edit-dept-form"
            action={handleEdit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <input type="hidden" name="id" value={editTarget.id} />
            <div className="field">
              <label htmlFor="dept-edit-name">Department name</label>
              <input id="dept-edit-name" name="name" type="text" defaultValue={editTarget.name} required />
            </div>
            <div className="field">
              <label htmlFor="dept-edit-code">Department code</label>
              <input id="dept-edit-code" name="code" type="text" defaultValue={editTarget.code} required style={{ textTransform: "uppercase" }} />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
