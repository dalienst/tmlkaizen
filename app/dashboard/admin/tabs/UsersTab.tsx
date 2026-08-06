"use client";

import { useState, useTransition } from "react";
import type { User, Location, Department } from "@/db/schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createUser, updateUser, toggleUserActive, resendCredentials } from "@/actions/admin-actions";
import { ROLE_LABELS, formatDate } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";
import { toast } from "react-hot-toast";

interface UsersTabProps {
  users: User[];
  locations: Location[];
  departments: Department[];
  hrLocationsMapped: { hrUserId: number; locationId: number }[];
}

export default function UsersTab({
  users,
  locations,
  departments,
  hrLocationsMapped,
}: UsersTabProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("HR");
  const [selectedHRLocations, setSelectedHRLocations] = useState<number[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<string>("HR");
  const [editHRLocations, setEditHRLocations] = useState<number[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  const [resendingId, setResendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── HR Locations Checklist Toggles ──────────────────────────────────────────
  function toggleHRLocation(id: number) {
    setSelectedHRLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  function toggleEditHRLocation(id: number) {
    setEditHRLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function handleCreate(fd: FormData) {
    setCreateError(null);
    if (selectedRole === "HR") {
      fd.set("hrLocationIds", JSON.stringify(selectedHRLocations));
    }
    
    startTransition(async () => {
      const result = await createUser(fd);
      if (result?.error) {
        setCreateError(result.error);
        toast.error(result.error);
      } else {
        setCreateOpen(false);
        setSelectedRole("HR");
        setSelectedHRLocations([]);
        toast.success("User created successfully!");
      }
    });
  }

  async function handleEdit(fd: FormData) {
    setEditError(null);
    if (editRole === "HR") {
      fd.set("hrLocationIds", JSON.stringify(editHRLocations));
    }

    startTransition(async () => {
      const result = await updateUser(fd);
      if (result?.error) {
        setEditError(result.error);
        toast.error(result.error);
      } else {
        setEditTarget(null);
        toast.success("User updated successfully!");
      }
    });
  }

  function handleToggle(user: User) {
    startTransition(async () => {
      await toggleUserActive(user.id, !user.isActive);
      toast.success(`User ${user.isActive ? "deactivated" : "activated"} successfully.`);
    });
  }

  function handleResend(userId: number) {
    setResendingId(userId);
    startTransition(async () => {
      const res = await resendCredentials(userId);
      setResendingId(null);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("New password generated and emailed to the user.");
      }
    });
  }

  function openEditModal(u: User) {
    setEditTarget(u);
    setEditRole(u.role);
    // Find pre-selected HR locations
    const selected = hrLocationsMapped
      .filter((hl) => hl.hrUserId === u.id)
      .map((hl) => hl.locationId);
    setEditHRLocations(selected);
    setEditError(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold" style={{ fontSize: "0.9375rem" }}>Management Users</div>
          <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
            Accounts receive credentials by email immediately upon creation.
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          + Add user
        </Button>
      </div>

      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Staff ID</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th style={{ width: "18rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                  No management users yet.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td className="text-sub">{u.email}</td>
                <td className="text-sub">
                  {u.staffId ? (
                    <code style={{ fontSize: "0.8125rem" }}>{u.staffId}</code>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  <span className="badge badge-brand">
                    {ROLE_LABELS[u.role as UserRole]}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.isActive ? "badge-completed" : "badge-neutral"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-sub">{formatDate(u.createdAt)}</td>
                <td>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(u)}
                      disabled={isPending}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isLoading={resendingId === u.id}
                      disabled={isPending}
                      onClick={() => handleResend(u.id)}
                    >
                      Resend Password
                    </Button>
                    <Button
                      size="sm"
                      variant={u.isActive ? "danger" : "secondary"}
                      isLoading={isPending && resendingId !== u.id && editTarget?.id !== u.id}
                      onClick={() => handleToggle(u)}
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => { setCreateOpen(false); setCreateError(null); }}
        title="Add user"
        maxWidth="28rem"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="create-user-form" isLoading={isPending}>
              Create &amp; send credentials
            </Button>
          </>
        }
      >
        <form
          id="create-user-form"
          action={handleCreate}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {createError && <div className="alert alert-error">{createError}</div>}

          <p className="text-sub" style={{ fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
            A password will be auto-generated and emailed to the user. They can change it after signing in.
          </p>

          <div className="field">
            <label htmlFor="user-name">Full name</label>
            <input id="user-name" name="name" type="text" placeholder="Jane Doe" required />
          </div>
          <div className="field">
            <label htmlFor="user-email">Email address</label>
            <input id="user-email" name="email" type="email" placeholder="jane@company.com" required />
          </div>
          <div className="field">
            <label htmlFor="user-staffid">Staff ID <span className="text-muted">(optional)</span></label>
            <input id="user-staffid" name="staffId" type="text" placeholder="e.g. EMP-001" />
          </div>
          <div className="field">
            <label htmlFor="user-role">Role</label>
            <select
              id="user-role"
              name="role"
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setSelectedHRLocations([]); }}
              required
            >
              <option value="HR">HR</option>
              <option value="GM">General Manager</option>
              <option value="DEPT_MANAGER">Department Manager</option>
            </select>
          </div>

          {selectedRole === "GM" && (
            <div className="field">
              <label htmlFor="user-location">Assigned location</label>
              <select id="user-location" name="locationId" required>
                <option value="">Select location…</option>
                {locations.filter((l) => l.isActive).map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedRole === "DEPT_MANAGER" && (
            <div className="field">
              <label htmlFor="user-department">Assigned department</label>
              <select id="user-department" name="departmentId" required>
                <option value="">Select department…</option>
                {departments.filter((d) => d.isActive).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedRole === "HR" && (
            <div className="field">
              <label>Assigned locations <span className="text-muted">(select all that apply)</span></label>
              <div className="checkbox-group" style={{ marginTop: "0.375rem" }}>
                {locations.filter((l) => l.isActive).map((l) => (
                  <label
                    key={l.id}
                    className={`checkbox-chip${selectedHRLocations.includes(l.id) ? " selected" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      style={{ display: "none" }}
                      checked={selectedHRLocations.includes(l.id)}
                      onChange={() => toggleHRLocation(l.id)}
                    />
                    {l.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => { setEditTarget(null); setEditError(null); }}
        title="Edit user"
        maxWidth="28rem"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="edit-user-form" isLoading={isPending}>
              Save changes
            </Button>
          </>
        }
      >
        {editTarget && (
          <form
            id="edit-user-form"
            action={handleEdit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {editError && <div className="alert alert-error">{editError}</div>}
            <input type="hidden" name="id" value={editTarget.id} />

            <div className="field">
              <label htmlFor="edit-user-name">Full name</label>
              <input
                id="edit-user-name"
                name="name"
                type="text"
                defaultValue={editTarget.name}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="edit-user-email">Email address</label>
              <input
                id="edit-user-email"
                name="email"
                type="email"
                defaultValue={editTarget.email}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="edit-user-staffid">Staff ID <span className="text-muted">(optional)</span></label>
              <input
                id="edit-user-staffid"
                name="staffId"
                type="text"
                defaultValue={editTarget.staffId ?? ""}
                placeholder="e.g. EMP-001"
              />
            </div>
            <div className="field">
              <label htmlFor="edit-user-role">Role</label>
              <select
                id="edit-user-role"
                name="role"
                value={editRole}
                onChange={(e) => { setEditRole(e.target.value); setEditHRLocations([]); }}
                required
              >
                <option value="HR">HR</option>
                <option value="GM">General Manager</option>
                <option value="DEPT_MANAGER">Department Manager</option>
              </select>
            </div>

            {editRole === "GM" && (
              <div className="field">
                <label htmlFor="edit-user-location">Assigned location</label>
                <select id="edit-user-location" name="locationId" defaultValue={editTarget.locationId ?? ""} required>
                  <option value="">Select location…</option>
                  {locations.filter((l) => l.isActive).map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}

            {editRole === "DEPT_MANAGER" && (
              <div className="field">
                <label htmlFor="edit-user-department">Assigned department</label>
                <select id="edit-user-department" name="departmentId" defaultValue={editTarget.departmentId ?? ""} required>
                  <option value="">Select department…</option>
                  {departments.filter((d) => d.isActive).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {editRole === "HR" && (
              <div className="field">
                <label>Assigned locations <span className="text-muted">(select all that apply)</span></label>
                <div className="checkbox-group" style={{ marginTop: "0.375rem" }}>
                  {locations.filter((l) => l.isActive).map((l) => (
                    <label
                      key={l.id}
                      className={`checkbox-chip${editHRLocations.includes(l.id) ? " selected" : ""}`}
                      style={{ cursor: "pointer`" }}
                    >
                      <input
                        type="checkbox"
                        style={{ display: "none" }}
                        checked={editHRLocations.includes(l.id)}
                        onChange={() => toggleEditHRLocation(l.id)}
                      />
                      {l.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
