"use client";

import { useState, useTransition } from "react";
import type { User, Location, Department, Group, Staff } from "@/db/schema";
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
  groups: Group[];
  hrLocationsMapped: { hrUserId: string; locationId: string }[];
  gmLocationsMapped: { gmUserId: string; locationId: string }[];
  groupManagersGroupsMapped: { groupManagerId: string; groupId: string }[];
  managersDepartmentsMapped: { managerUserId: string; departmentId: string }[];
  staff: Staff[];
}

export default function UsersTab({
  users,
  locations,
  departments,
  groups,
  hrLocationsMapped,
  gmLocationsMapped,
  groupManagersGroupsMapped,
  managersDepartmentsMapped,
  staff,
}: UsersTabProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("HR");

  const getDeptLabel = (d: Department) => {
    const loc = locations.find((l) => l.id === d.locationId);
    return loc ? `${d.name} (${loc.name})` : d.name;
  };

  const [selectedHRLocations, setSelectedHRLocations] = useState<string[]>([]);
  const [selectedGMLocations, setSelectedGMLocations] = useState<string[]>([]);
  const [selectedGroupManagerGroups, setSelectedGroupManagerGroups] = useState<string[]>([]);
  const [selectedManagerDepartments, setSelectedManagerDepartments] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  // Promote staff to user states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formStaffId, setFormStaffId] = useState("");
  const [formDeptId, setFormDeptId] = useState("");
  const [selectedStaffSelectId, setSelectedStaffSelectId] = useState("");

  const existingStaffIds = new Set(users.map((u) => u.staffId?.toUpperCase()).filter(Boolean));
  const existingEmails = new Set(users.map((u) => u.email.toLowerCase()));

  const eligibleStaff = staff.filter(
    (s) => !existingStaffIds.has(s.staffId.toUpperCase()) && !existingEmails.has(s.email.toLowerCase())
  );

  const handleStaffSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedStaffSelectId(val);
    if (val === "") {
      setFormName("");
      setFormEmail("");
      setFormStaffId("");
      setFormDeptId("");
    } else {
      const match = eligibleStaff.find((s) => s.id === val);
      if (match) {
        setFormName(match.name);
        setFormEmail(match.email);
        setFormStaffId(match.staffId);
        setFormDeptId(match.departmentId);
      }
    }
  };

  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<string>("HR");
  const [editHRLocations, setEditHRLocations] = useState<string[]>([]);
  const [editGMLocations, setEditGMLocations] = useState<string[]>([]);
  const [editGroupManagerGroups, setEditGroupManagerGroups] = useState<string[]>([]);
  const [editManagerDepartments, setEditManagerDepartments] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  const [resendingId, setResendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── HR / GM / Group Manager / Department Manager Checklist Toggles ───────────
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
  function toggleGroupManagerGroup(id: string) {
    setSelectedGroupManagerGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }
  function toggleManagerDepartment(id: string) {
    setSelectedManagerDepartments((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
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
  function toggleEditGroupManagerGroup(id: string) {
    setEditGroupManagerGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }
  function toggleEditManagerDepartment(id: string) {
    setEditManagerDepartments((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
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
    if (selectedRole === "GROUP_MANAGER") {
      fd.set("groupManagerGroupIds", JSON.stringify(selectedGroupManagerGroups));
    }
    if (selectedRole === "DEPT_MANAGER") {
      fd.set("managerDepartmentIds", JSON.stringify(selectedManagerDepartments));
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
        setSelectedGroupManagerGroups([]);
        setSelectedManagerDepartments([]);
        setFormName("");
        setFormEmail("");
        setFormStaffId("");
        setFormDeptId("");
        setSelectedStaffSelectId("");
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
    if (editRole === "GROUP_MANAGER") {
      fd.set("groupManagerGroupIds", JSON.stringify(editGroupManagerGroups));
    }
    if (editRole === "DEPT_MANAGER") {
      fd.set("managerDepartmentIds", JSON.stringify(editManagerDepartments));
    }
    startTransition(async () => {
      const result = await updateUser(fd);
      if (result?.error) {
        setEditError(result.error);
        toast.error(result.error);
      } else {
        setEditTarget(null);
        setEditManagerDepartments([]);
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
    const selectedGroups = groupManagersGroupsMapped
      .filter((gg) => gg.groupManagerId === u.id)
      .map((gg) => gg.groupId);
    setEditGroupManagerGroups(selectedGroups);
    const selectedDepts = managersDepartmentsMapped
      .filter((md) => md.managerUserId === u.id)
      .map((md) => md.departmentId);
    setEditManagerDepartments(selectedDepts);
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
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setCreateOpen(true);
            setFormName("");
            setFormEmail("");
            setFormStaffId("");
            setFormDeptId("");
            setSelectedStaffSelectId("");
            setCreateError(null);
          }}
        >
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

          {/* Pre-fill from existing staff */}
          {eligibleStaff.length > 0 && (
            <div
              className="field"
              style={{
                borderBottom: "1px solid var(--color-border)",
                paddingBottom: "1rem",
                marginBottom: "0.5rem",
              }}
            >
              <label htmlFor="select-staff">Pre-fill from existing staff member</label>
              <select
                id="select-staff"
                value={selectedStaffSelectId}
                onChange={handleStaffSelect}
                style={{ background: "rgba(var(--color-brand-rgb), 0.05)" }}
              >
                <option value="">-- Choose existing staff (optional) --</option>
                {eligibleStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.staffId})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="user-name">Full name</label>
            <input
              id="user-name"
              name="name"
              type="text"
              placeholder="Jane Doe"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="user-email">Email address</label>
            <input
              id="user-email"
              name="email"
              type="email"
              placeholder="jane@company.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="user-staffid">Staff ID <span className="text-muted">(optional)</span></label>
            <input
              id="user-staffid"
              name="staffId"
              type="text"
              placeholder="e.g. EMP-001"
              value={formStaffId}
              onChange={(e) => setFormStaffId(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="user-role">Role</label>
            <select
              id="user-role"
              name="role"
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setSelectedHRLocations([]);
                setSelectedGMLocations([]);
                setSelectedGroupManagerGroups([]);
              }}
              required
            >
              <option value="SYSTEM_ADMIN">System Admin</option>
              <option value="HR">HR</option>
              <option value="GM">General Manager</option>
              <option value="DEPT_MANAGER">Department Manager</option>
              <option value="GROUP_MANAGER">Group Manager</option>
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

          {/* Group Manager multi-group checkboxes */}
          {selectedRole === "GROUP_MANAGER" && (
            <div className="field">
              <label>Assigned groups <span className="text-muted">(select all that apply)</span></label>
              <div className="checkbox-group" style={{ marginTop: "0.375rem" }}>
                {groups.filter((g) => g.isActive).map((g) => (
                  <label
                    key={g.id}
                    className={`checkbox-chip${selectedGroupManagerGroups.includes(g.id) ? " selected" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      style={{ display: "none" }}
                      checked={selectedGroupManagerGroups.includes(g.id)}
                      onChange={() => toggleGroupManagerGroup(g.id)}
                    />
                    {g.name} ({g.code})
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Department Manager multi-department checkboxes */}
          {selectedRole === "DEPT_MANAGER" && (
            <div className="field">
              <label>Assigned departments <span className="text-muted">(select all that apply)</span></label>
              <div className="checkbox-group" style={{ marginTop: "0.375rem" }}>
                {departments.filter((d) => d.isActive).map((d) => (
                  <label
                    key={d.id}
                    className={`checkbox-chip${selectedManagerDepartments.includes(d.id) ? " selected" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      style={{ display: "none" }}
                      checked={selectedManagerDepartments.includes(d.id)}
                      onChange={() => toggleManagerDepartment(d.id)}
                    />
                    {getDeptLabel(d)}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="user-department">
              {selectedRole === "DEPT_MANAGER" ? "Primary department" : "Home department (for staff roster)"}{" "}
              {selectedRole !== "DEPT_MANAGER" && selectedRole !== "GM" && selectedRole !== "HR" && selectedRole !== "GROUP_MANAGER" && (
                <span className="text-muted">(required if Staff ID is entered)</span>
              )}
            </label>
            <select
              id="user-department"
              name="departmentId"
              value={formDeptId}
              onChange={(e) => setFormDeptId(e.target.value)}
            >
              <option value="">Select department…</option>
              {departments.filter((d) => d.isActive).map((d) => (
                <option key={d.id} value={d.id}>{getDeptLabel(d)}</option>
              ))}
            </select>
          </div>

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
                onChange={(e) => {
                  setEditRole(e.target.value);
                  setEditHRLocations([]);
                  setEditGMLocations([]);
                  setEditGroupManagerGroups([]);
                  setEditManagerDepartments([]);
                }}
                required
              >
                <option value="SYSTEM_ADMIN">System Admin</option>
                <option value="HR">HR</option>
                <option value="GM">General Manager</option>
                <option value="DEPT_MANAGER">Department Manager</option>
                <option value="GROUP_MANAGER">Group Manager</option>
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

            {/* Group Manager multi-group checkboxes */}
            {editRole === "GROUP_MANAGER" && (
              <div className="field">
                <label>Assigned groups <span className="text-muted">(select all that apply)</span></label>
                <div className="checkbox-group" style={{ marginTop: "0.375rem" }}>
                  {groups.filter((g) => g.isActive).map((g) => (
                    <label
                      key={g.id}
                      className={`checkbox-chip${editGroupManagerGroups.includes(g.id) ? " selected" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        style={{ display: "none" }}
                        checked={editGroupManagerGroups.includes(g.id)}
                        onChange={() => toggleEditGroupManagerGroup(g.id)}
                      />
                      {g.name} ({g.code})
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Department Manager multi-department checkboxes */}
            {editRole === "DEPT_MANAGER" && (
              <div className="field">
                <label>Assigned departments <span className="text-muted">(select all that apply)</span></label>
                <div className="checkbox-group" style={{ marginTop: "0.375rem" }}>
                  {departments.filter((d) => d.isActive).map((d) => (
                    <label
                      key={d.id}
                      className={`checkbox-chip${editManagerDepartments.includes(d.id) ? " selected" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        style={{ display: "none" }}
                        checked={editManagerDepartments.includes(d.id)}
                        onChange={() => toggleEditManagerDepartment(d.id)}
                      />
                      {getDeptLabel(d)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="edit-user-department">
                {editRole === "DEPT_MANAGER" ? "Primary department" : "Home department (for staff roster)"}{" "}
                {editRole !== "DEPT_MANAGER" && editRole !== "GM" && editRole !== "HR" && editRole !== "GROUP_MANAGER" && (
                  <span className="text-muted">(required if Staff ID is entered)</span>
                )}
              </label>
              <select id="edit-user-department" name="departmentId" defaultValue={editTarget.departmentId ?? ""}>
                <option value="">Select department…</option>
                {departments.filter((d) => d.isActive).map((d) => (
                  <option key={d.id} value={d.id}>{getDeptLabel(d)}</option>
                ))}
              </select>
            </div>

            {editRole === "HR" && (
              <div className="field">
                <label>Assigned locations <span className="text-muted">(select all that apply)</span></label>
                <div className="checkbox-group" style={{ marginTop: "0.375rem" }}>
                  {locations.filter((l) => l.isActive).map((l) => (
                    <label
                      key={l.id}
                      className={`checkbox-chip${editHRLocations.includes(l.id) ? " selected" : ""}`}
                      style={{ cursor: "pointer" }}
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
