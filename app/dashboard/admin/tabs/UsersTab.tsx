"use client";

import { useState, useTransition } from "react";
import type { User, Location, Department } from "@/db/schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createUser, toggleUserActive, resendCredentials } from "@/actions/admin-actions";
import { ROLE_LABELS, formatDate } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";

interface UsersTabProps {
  users: User[];
  locations: Location[];
  departments: Department[];
}

export default function UsersTab({ users, locations, departments }: UsersTabProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("HR");
  const [selectedHRLocations, setSelectedHRLocations] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);
  const [tabSuccess, setTabSuccess] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleHRLocation(id: number) {
    setSelectedHRLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  async function handleCreate(fd: FormData) {
    setError(null);
    if (selectedRole === "HR") {
      fd.set("hrLocationIds", JSON.stringify(selectedHRLocations));
    }
    const result = await createUser(fd);
    if (result?.error) {
      setError(result.error);
    } else {
      setCreateOpen(false);
      setSelectedRole("HR");
      setSelectedHRLocations([]);
      setTabSuccess("User created and credentials emailed successfully.");
    }
  }

  function handleToggle(user: User) {
    setTabError(null);
    setTabSuccess(null);
    startTransition(async () => {
      await toggleUserActive(user.id, !user.isActive);
    });
  }

  function handleResend(userId: number) {
    setTabError(null);
    setTabSuccess(null);
    setResendingId(userId);
    startTransition(async () => {
      const res = await resendCredentials(userId);
      setResendingId(null);
      if (res?.error) {
        setTabError(res.error);
      } else {
        setTabSuccess("New credentials generated and emailed successfully.");
      }
    });
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

      {tabError && <div className="alert alert-error mb-4">{tabError}</div>}
      {tabSuccess && <div className="alert alert-success mb-4">{tabSuccess}</div>}

      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th style={{ width: "14rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                  No management users yet.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td className="text-sub">{u.email}</td>
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
                      isLoading={resendingId === u.id}
                      disabled={isPending}
                      onClick={() => handleResend(u.id)}
                    >
                      Resend Password
                    </Button>
                    <Button
                      size="sm"
                      variant={u.isActive ? "danger" : "secondary"}
                      isLoading={isPending && resendingId !== u.id}
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
        onClose={() => { setCreateOpen(false); setError(null); }}
        title="Add user"
        maxWidth="28rem"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="create-user-form">
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
          {error && <div className="alert alert-error">{error}</div>}

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
    </div>
  );
}
