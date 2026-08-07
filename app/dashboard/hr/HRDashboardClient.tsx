"use client";

import { useState, useTransition, useRef } from "react";
import type { Staff, Department, Location } from "@/db/schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { addStaffMember, updateStaffMember, removeStaffMember, bulkImportStaff } from "@/actions/hr-actions";
import { toast } from "react-hot-toast";

interface BulkRow {
  staffId: string;
  name: string;
  email: string;
  departmentCode: string;
}

interface HRDashboardClientProps {
  staff: Staff[];
  departments: Department[];
  locations: Location[];
}

export default function HRDashboardClient({
  staff,
  departments,
  locations,
}: HRDashboardClientProps) {
  const [search, setSearch] = useState("");
  const [filterDeptId, setFilterDeptId] = useState<string | "all">("all");
  const [isAddOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Staff | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [isBulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    { staffId: "", name: "", email: "", departmentCode: "" },
    { staffId: "", name: "", email: "", departmentCode: "" },
    { staffId: "", name: "", email: "", departmentCode: "" },
  ]);
  const [bulkError, setBulkError] = useState<string | null>(null);

  function addBulkRow() {
    if (bulkRows.length >= 50) return;
    setBulkRows((prev) => [...prev, { staffId: "", name: "", email: "", departmentCode: "" }]);
  }

  function removeBulkRow(idx: number) {
    if (bulkRows.length <= 1) return;
    setBulkRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateBulkRow(idx: number, field: keyof BulkRow, val: string) {
    setBulkRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  }

  async function handleBulkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBulkError(null);

    const toInsert: { staffId: string; name: string; email: string; departmentCode: string }[] = [];
    for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i];
      const staffId = row.staffId.trim();
      const name = row.name.trim();
      const email = row.email.trim();
      const departmentCode = row.departmentCode.trim();

      if (!staffId || !name || !email || !departmentCode) {
        setBulkError(`Row ${i + 1} has incomplete details. All fields are required.`);
        return;
      }
      toInsert.push({ staffId, name, email, departmentCode });
    }

    startTransition(async () => {
      const res = await bulkImportStaff(toInsert);
      if (res?.error) {
        setBulkError(res.error);
        toast.error(res.error);
      } else {
        setBulkOpen(false);
        setBulkRows([
          { staffId: "", name: "", email: "", departmentCode: "" },
          { staffId: "", name: "", email: "", departmentCode: "" },
          { staffId: "", name: "", email: "", departmentCode: "" },
        ]);
        toast.success(`${toInsert.length} staff member(s) created successfully.`);
      }
    });
  }

  const filtered = staff.filter((s) => {
    const matchesSearch =
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.staffId.toLowerCase().includes(search.toLowerCase());
    const matchesDept =
      filterDeptId === "all" || s.departmentId === filterDeptId;
    return matchesSearch && matchesDept && s.isActive;
  });

  const getDeptLabel = (d: Department) => {
    const loc = locations.find((l) => l.id === d.locationId);
    return loc ? `${d.name} (${loc.name})` : d.name;
  };

  const deptName = (id: string) => {
    const d = departments.find((dept) => dept.id === id);
    return d ? getDeptLabel(d) : "—";
  };

  async function handleAdd(fd: FormData) {
    setAddError(null);
    const result = await addStaffMember(fd);
    if (result?.error) {
      setAddError(result.error);
      toast.error(result.error);
    } else {
      setAddOpen(false);
      toast.success("Staff member added successfully.");
    }
  }

  async function handleEdit(fd: FormData) {
    const res = await updateStaffMember(fd);
    if (res?.error) {
      toast.error(res.error);
    } else {
      setEditTarget(null);
      toast.success("Staff member updated successfully.");
    }
  }

  function handleRemove() {
    if (!removeTarget) return;
    startTransition(async () => {
      await removeStaffMember(removeTarget.id);
      setRemoveTarget(null);
      toast.success("Staff member removed from roster.");
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
      const rows: { staffId: string; name: string; email: string; departmentCode: string }[] = [];

      for (const line of lines) {
        const [staffId, name, email, deptCode] = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (!staffId || !name || !email || !deptCode) continue;
        rows.push({ staffId, name, email, departmentCode: deptCode });
      }

      if (rows.length === 0) {
        setCsvError("No valid rows found. Expected columns: staffId, name, email, departmentCode");
        toast.error("No valid rows found in CSV.");
        return;
      }

      const result = await bulkImportStaff(rows);
      if (result?.error) {
        setCsvError(result.error);
        toast.error(result.error);
      } else {
        const msg = `${result?.imported ?? rows.length} staff member(s) imported.`;
        setCsvSuccess(msg);
        toast.success(msg);
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
            <div className="text-sub" style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
              CSV format: <code style={{ fontSize: "0.75rem", background: "var(--color-muted)", padding: "1px 4px", borderRadius: "3px" }}>staffId, name, email, departmentCode</code>
            </div>
            <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
              Note: The CSV file must include a header row. The <code>departmentCode</code> column must contain a valid, registered department code (e.g. <code>IT</code> or <code>HR</code>).
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
            onChange={(e) => setFilterDeptId(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{getDeptLabel(d)}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setBulkOpen(true)}>
            Bulk Add Staff
          </Button>
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            + Add staff
          </Button>
        </div>
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
                <option key={d.id} value={d.id}>{getDeptLabel(d)}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit */}
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
            <div className="field">
              <label htmlFor="edit-s-dept">Department</label>
              <select id="edit-s-dept" name="departmentId" defaultValue={editTarget.departmentId} required>
                {departments.filter((d) => d.isActive).map((d) => (
                  <option key={d.id} value={d.id}>{getDeptLabel(d)}</option>
                ))}
              </select>
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

      {/* Bulk Add Staff Modal */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => { setBulkOpen(false); setBulkError(null); }}
        title="Bulk Add Staff Members"
        maxWidth="54rem"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="bulk-staff-form" isLoading={isPending}>
              Save all ({bulkRows.length})
            </Button>
          </>
        }
      >
        <form id="bulk-staff-form" onSubmit={handleBulkSubmit}>
          {bulkError && <div className="alert alert-error mb-4">{bulkError}</div>}
          <div className="alert alert-info mb-4" style={{ fontSize: "0.8125rem" }}>
            Add up to 50 staff members. Duplicates by Staff ID will be automatically skipped.
          </div>

          <div style={{ maxHeight: "24rem", overflowY: "auto", paddingRight: "0.5rem" }}>
            <div className="flex gap-2 font-semibold text-xs text-sub mb-2" style={{ paddingRight: "2rem" }}>
              <div style={{ flex: 1.5 }}>Staff ID *</div>
              <div style={{ flex: 2 }}>Full Name *</div>
              <div style={{ flex: 2 }}>Email Address *</div>
              <div style={{ flex: 2.5 }}>Department *</div>
            </div>

            {bulkRows.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  placeholder="e.g. EMP-001"
                  value={row.staffId}
                  onChange={(e) => updateBulkRow(idx, "staffId", e.target.value)}
                  required
                  style={{ flex: 1.5, padding: "0.375rem 0.5rem" }}
                />
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={row.name}
                  onChange={(e) => updateBulkRow(idx, "name", e.target.value)}
                  required
                  style={{ flex: 2, padding: "0.375rem 0.5rem" }}
                />
                <input
                  type="email"
                  placeholder="e.g. jane@company.com"
                  value={row.email}
                  onChange={(e) => updateBulkRow(idx, "email", e.target.value)}
                  required
                  style={{ flex: 2, padding: "0.375rem 0.5rem" }}
                />
                <select
                  value={row.departmentCode}
                  onChange={(e) => updateBulkRow(idx, "departmentCode", e.target.value)}
                  required
                  style={{ flex: 2.5, padding: "0.375rem 0.5rem" }}
                >
                  <option value="">Select department…</option>
                  {departments.filter((d) => d.isActive).map((d) => (
                    <option key={d.id} value={d.code}>{getDeptLabel(d)} ({d.code})</option>
                  ))}
                </select>
                <div style={{ width: "2rem", display: "flex", justifyContent: "center" }}>
                  {bulkRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBulkRow(idx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-danger)",
                        cursor: "pointer",
                        fontSize: "1rem",
                        padding: "0.25rem",
                      }}
                      title="Remove row"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1rem" }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={bulkRows.length >= 50}
              onClick={addBulkRow}
            >
              + Add another row
            </Button>
            <span className="text-muted ml-3" style={{ fontSize: "0.75rem" }}>
              ({bulkRows.length} / 50 rows)
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
