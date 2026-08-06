"use client";

import { useState, useTransition, useRef } from "react";
import type { Staff, Department, Location } from "@/db/schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { addStaffMember, updateStaffMember, removeStaffMember, bulkImportStaff } from "@/actions/hr-actions";

interface HRDashboardClientProps {
  staff: Staff[];
  departments: Department[];
  locations: Location[];
}

export default function HRDashboardClient({
  staff,
  departments,
}: HRDashboardClientProps) {
  const [search, setSearch] = useState("");
  const [filterDeptId, setFilterDeptId] = useState<number | "all">("all");
  const [isAddOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Staff | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const filtered = staff.filter((s) => {
    const matchesSearch =
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.staffId.toLowerCase().includes(search.toLowerCase());
    const matchesDept =
      filterDeptId === "all" || s.departmentId === filterDeptId;
    return matchesSearch && matchesDept && s.isActive;
  });

  const deptName = (id: number) =>
    departments.find((d) => d.id === id)?.name ?? "—";

  async function handleAdd(fd: FormData) {
    setAddError(null);
    const result = await addStaffMember(fd);
    if (result?.error) {
      setAddError(result.error);
    } else {
      setAddOpen(false);
    }
  }

  async function handleEdit(fd: FormData) {
    await updateStaffMember(fd);
    setEditTarget(null);
  }

  function handleRemove() {
    if (!removeTarget) return;
    startTransition(async () => {
      await removeStaffMember(removeTarget.id);
      setRemoveTarget(null);
    });
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    setCsvError(null);
    setCsvSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n").slice(1); // skip header
      const rows: { staffId: string; name: string; email: string; departmentId: number }[] = [];

      for (const line of lines) {
        const [staffId, name, email, deptIdStr] = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const departmentId = Number(deptIdStr);
        if (!staffId || !name || !email || !departmentId) continue;
        rows.push({ staffId, name, email, departmentId });
      }

      if (rows.length === 0) {
        setCsvError("No valid rows found. Expected columns: staffId, name, email, departmentId");
        return;
      }

      const result = await bulkImportStaff(rows);
      if (result?.error) {
        setCsvError(result.error);
      } else {
        setCsvSuccess(`${result.imported} staff member(s) imported.`);
      }

      // Reset file input
      if (csvInputRef.current) csvInputRef.current.value = "";
    };
    reader.readAsText(file);
  }

  return (
    <div>
      {/* CSV section */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold" style={{ fontSize: "0.875rem" }}>Bulk Import via CSV</div>
            <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
              CSV format: <code style={{ fontSize: "0.75rem", background: "var(--color-muted)", padding: "1px 4px", borderRadius: "3px" }}>staffId, name, email, departmentId</code>
            </div>
          </div>
          <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
            Upload CSV
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleCSV}
            />
          </label>
        </div>
        {csvError && <div className="alert alert-error mt-2">{csvError}</div>}
        {csvSuccess && <div className="alert alert-success mt-2">{csvSuccess}</div>}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap" style={{ flex: 1 }}>
          <input
            type="search"
            placeholder="Search by name or staff ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: "18rem" }}
          />
          <select
            value={filterDeptId}
            onChange={(e) =>
              setFilterDeptId(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            style={{ width: "auto" }}
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          + Add staff
        </Button>
      </div>

      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Staff ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th style={{ width: "8rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                  {search || filterDeptId !== "all"
                    ? "No staff match your filters."
                    : "No staff members yet. Add one manually or import via CSV."}
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>
                  <code style={{ fontSize: "0.8125rem", background: "var(--color-muted)", padding: "1px 6px", borderRadius: "3px" }}>
                    {s.staffId}
                  </code>
                </td>
                <td className="font-medium">{s.name}</td>
                <td className="text-sub">{s.email}</td>
                <td className="text-sub">{deptName(s.departmentId)}</td>
                <td>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditTarget(s)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => setRemoveTarget(s)}>Remove</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "0.625rem 1rem", borderTop: "1px solid var(--color-border)", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          {filtered.length} of {staff.filter((s) => s.isActive).length} staff shown
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => { setAddOpen(false); setAddError(null); }}
        title="Add staff member"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="add-staff-form">Add</Button>
          </>
        }
      >
        <form
          id="add-staff-form"
          action={handleAdd}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {addError && <div className="alert alert-error">{addError}</div>}
          <div className="field">
            <label htmlFor="s-staffid">Staff ID</label>
            <input id="s-staffid" name="staffId" type="text" placeholder="e.g. EMP-001" required />
          </div>
          <div className="field">
            <label htmlFor="s-name">Full name</label>
            <input id="s-name" name="name" type="text" placeholder="Jane Doe" required />
          </div>
          <div className="field">
            <label htmlFor="s-email">Email</label>
            <input id="s-email" name="email" type="email" placeholder="jane@company.com" required />
          </div>
          <div className="field">
            <label htmlFor="s-dept">Department</label>
            <select id="s-dept" name="departmentId" required>
              <option value="">Select department…</option>
              {departments.filter((d) => d.isActive).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit staff member"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="edit-staff-form">Save</Button>
          </>
        }
      >
        {editTarget && (
          <form
            id="edit-staff-form"
            action={handleEdit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <input type="hidden" name="id" value={editTarget.id} />
            <div className="field">
              <label>Staff ID</label>
              <input type="text" value={editTarget.staffId} readOnly style={{ background: "var(--color-muted)", cursor: "not-allowed" }} />
            </div>
            <div className="field">
              <label htmlFor="edit-s-name">Full name</label>
              <input id="edit-s-name" name="name" type="text" defaultValue={editTarget.name} required />
            </div>
            <div className="field">
              <label htmlFor="edit-s-email">Email</label>
              <input id="edit-s-email" name="email" type="email" defaultValue={editTarget.email} required />
            </div>
          </form>
        )}
      </Modal>

      {/* Remove confirm */}
      <Modal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove staff member"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" isLoading={isPending} onClick={handleRemove}>
              Remove
            </Button>
          </>
        }
      >
        {removeTarget && (
          <p style={{ fontSize: "0.875rem" }}>
            Remove <strong>{removeTarget.name}</strong> ({removeTarget.staffId}) from the roster?
            They will no longer be able to submit Kaizen forms.
          </p>
        )}
      </Modal>
    </div>
  );
}
