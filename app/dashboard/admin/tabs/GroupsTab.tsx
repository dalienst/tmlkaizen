"use client";

import { useState, useTransition } from "react";
import type { Group } from "@/db/schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  createGroup,
  updateGroup,
  toggleGroupActive,
  bulkCreateGroups,
} from "@/actions/admin-actions";
import { formatDate } from "@/lib/constants";
import { toast } from "react-hot-toast";

interface GroupsTabProps {
  groups: Group[];
}

export default function GroupsTab({ groups }: GroupsTabProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null);
  const [isPending, startTransition] = useTransition();

  const [isBulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<{ name: string; code: string }[]>([
    { name: "", code: "" },
    { name: "", code: "" },
    { name: "", code: "" },
  ]);
  const [bulkError, setBulkError] = useState<string | null>(null);

  function addBulkRow() {
    if (bulkRows.length >= 50) return;
    setBulkRows((prev) => [...prev, { name: "", code: "" }]);
  }

  function removeBulkRow(idx: number) {
    if (bulkRows.length <= 1) return;
    setBulkRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateBulkRow(idx: number, field: "name" | "code", val: string) {
    setBulkRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  }

  async function handleBulkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBulkError(null);

    const validRows = bulkRows.filter((r) => r.name.trim() !== "");
    if (validRows.length === 0) {
      setBulkError("Please enter a name for at least one group.");
      return;
    }

    startTransition(async () => {
      const res = await bulkCreateGroups(validRows);
      if (res?.error) {
        setBulkError(res.error);
        toast.error(res.error);
      } else {
        setBulkOpen(false);
        setBulkRows([
          { name: "", code: "" },
          { name: "", code: "" },
          { name: "", code: "" },
        ]);
        toast.success(`Groups created successfully.`);
      }
    });
  }

  function handleToggle(grp: Group) {
    startTransition(async () => {
      await toggleGroupActive(grp.id, !grp.isActive);
      toast.success(`Group ${grp.isActive ? "deactivated" : "activated"} successfully.`);
    });
  }

  async function handleCreate(fd: FormData) {
    startTransition(async () => {
      const res = await createGroup(fd);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setCreateOpen(false);
        toast.success("Group created successfully.");
      }
    });
  }

  async function handleEdit(fd: FormData) {
    startTransition(async () => {
      const res = await updateGroup(fd);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setEditTarget(null);
        toast.success("Group updated successfully.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold" style={{ fontSize: "0.9375rem" }}>Groups</div>
          <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
            Cross-location department categories
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setBulkOpen(true)}>
            Bulk Add
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            + Add group
          </Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ width: "8rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                  No groups created yet.
                </td>
              </tr>
            )}
            {groups.map((grp) => (
              <tr key={grp.id}>
                <td className="font-medium">{grp.name}</td>
                <td>
                  <code style={{ fontSize: "0.8125rem" }}>{grp.code}</code>
                </td>
                <td>
                  <span className={`badge badge-${grp.isActive ? "success" : "neutral"}`}>
                    {grp.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-sub">{formatDate(grp.createdAt)}</td>
                <td>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditTarget(grp)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={grp.isActive ? "danger" : "secondary"}
                      isLoading={isPending && editTarget?.id !== grp.id}
                      onClick={() => handleToggle(grp)}
                    >
                      {grp.isActive ? "Deactivate" : "Activate"}
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
        title="Add group"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="create-group-form" isLoading={isPending}>Save</Button>
          </>
        }
      >
        <form
          id="create-group-form"
          action={handleCreate}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div className="field">
            <label htmlFor="grp-name">Group name</label>
            <input id="grp-name" name="name" type="text" placeholder="e.g. Kitchens" required />
          </div>
          <div className="field">
            <label htmlFor="grp-code">Group code <span className="text-muted">(optional, e.g. GRP-KIT)</span></label>
            <input id="grp-code" name="code" type="text" placeholder="Auto-generated if left blank" style={{ textTransform: "uppercase" }} />
          </div>
        </form>
      </Modal>

      {/* Edit */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit group"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="edit-group-form" isLoading={isPending}>Save changes</Button>
          </>
        }
      >
        {editTarget && (
          <form
            id="edit-group-form"
            action={handleEdit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <input type="hidden" name="id" value={editTarget.id} />
            <div className="field">
              <label htmlFor="grp-edit-name">Group name</label>
              <input id="grp-edit-name" name="name" type="text" defaultValue={editTarget.name} required />
            </div>
            <div className="field">
              <label htmlFor="grp-edit-code">Group code</label>
              <input id="grp-edit-code" name="code" type="text" defaultValue={editTarget.code} required style={{ textTransform: "uppercase" }} />
            </div>
          </form>
        )}
      </Modal>

      {/* Bulk Add Groups Modal */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => { setBulkOpen(false); setBulkError(null); }}
        title="Bulk Add Groups"
        maxWidth="44rem"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="bulk-group-form" isLoading={isPending}>
              Save all ({bulkRows.length})
            </Button>
          </>
        }
      >
        <form id="bulk-group-form" onSubmit={handleBulkSubmit}>
          {bulkError && <div className="alert alert-error mb-4">{bulkError}</div>}
          <div className="alert alert-info mb-4" style={{ fontSize: "0.8125rem" }}>
            Add up to 50 groups. Duplicates by Group Code will be automatically skipped or flagged.
          </div>

          <div style={{ maxHeight: "24rem", overflowY: "auto", paddingRight: "0.5rem" }}>
            <div className="flex gap-2 font-semibold text-xs text-sub mb-2" style={{ paddingRight: "2rem" }}>
              <div style={{ flex: 2 }}>Group Name *</div>
              <div style={{ flex: 1.5 }}>Group Code (optional, e.g. GRP-KIT)</div>
            </div>

            {bulkRows.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  placeholder="e.g. Kitchens"
                  value={row.name}
                  onChange={(e) => updateBulkRow(idx, "name", e.target.value)}
                  required={idx === 0}
                  style={{ flex: 2, padding: "0.375rem 0.5rem" }}
                />
                <input
                  type="text"
                  placeholder="e.g. GRP-KIT"
                  value={row.code}
                  onChange={(e) => updateBulkRow(idx, "code", e.target.value)}
                  style={{ flex: 1.5, padding: "0.375rem 0.5rem", textTransform: "uppercase" }}
                />
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
