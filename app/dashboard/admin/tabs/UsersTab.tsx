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
  hrLocationsMapped: { hrUserId: string; locationId: string }[];
  gmLocationsMapped: { gmUserId: string; locationId: string }[];
}

export default function UsersTab({
  users,
  locations,
  departments,
  hrLocationsMapped,
  gmLocationsMapped,
}: UsersTabProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("HR");
  const [selectedHRLocations, setSelectedHRLocations] = useState<string[]>([]);
  const [selectedGMLocations, setSelectedGMLocations] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<string>("HR");
  const [editHRLocations, setEditHRLocations] = useState<string[]>([]);
  const [editGMLocations, setEditGMLocations] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  const [resendingId, setResendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── HR / GM Locations Checklist Toggles ─────────────────────────────────────
  function toggleHRLocation(id: string) {
    setSelectedHRLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }
  function toggleGMLocation(id: string) {
    setSelectedGMLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }
  function toggleEditHRLocation(id: string) {
    setEditHRLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }
  function toggleEditGMLocation(id: string) {
    setEditGMLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function handleCreate(fd: FormData) {
    setCreateError(null);
    if (selectedRole === "HR") {
      fd.set("hrLocationIds", JSON.stringify(selectedHRLocations));
    }
    if (selectedRole === "GM") {
      fd.set("gmLocationIds", JSON.stringify(selectedGMLocations));
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
        setSelectedGMLocations([]);
        toast.success("User created successfully!");
      }
    });
  }

  async function handleEdit(fd: FormData) {
    setEditError(null);
    if (editRole === "HR") {
      fd.set("hrLocationIds", JSON.stringify(editHRLocations));
    }
    if (editRole === "GM") {
      fd.set("gmLocationIds", JSON.stringify(editGMLocations));
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

  function handleResend(userId: string) {
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
    const selectedHR = hrLocationsMapped
      .filter((hl) => hl.hrUserId === u.id)
      .map((hl) => hl.locationId);
    setEditHRLocations(selectedHR);
    const selectedGM = gmLocationsMapped
      .filter((gl) => gl.gmUserId === u.id)
      .map((gl) => gl.locationId);
    setEditGMLocations(selectedGM);
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

          {/* GM multi-location checkboxes */}
          {selectedRole === "GM" && (
            <div className="field">
              <label>Assigned locations <span className="text-muted">(select all that apply)</span></label>
              <div className="checkbox-group" style={{ marginTop: "0.375rem" }}>
                {locations.filter((l) => l.isActive).map((l) => (
                  <label
                    key={l.id}
                    className={`checkbox-chip${selectedGMLocations.includes(l.id) ? " selected" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      style={{ display: "none" }}
                      checked={selectedGMLocations.includes(l.id)}
                      onChange={() => toggleGMLocation(l.id)}
                    />
                    {l.name}
                  </label>
                ))}
              </div>
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
                <label>Assigned locations <span className="text-muted">(select all that apply)</span></label>
                <div className="checkbox-group" style={{ marginTop: "0.375rem" }}>
                  {locations.filter((l) => l.isActive).map((l) => (
                    <label
                      key={l.id}
                      className={`checkbox-chip${editGMLocations.includes(l.id) ? " selected" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        style={{ display: "none" }}
                        checked={editGMLocations.includes(l.id)}
                        onChange={() => toggleEditGMLocation(l.id)}
                      />
                      {l.name}
                    </label>
                  ))}
                </div>
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
