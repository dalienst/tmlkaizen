"use client";

import { useState, useTransition } from "react";
import type { Location } from "@/db/schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  createLocation,
  updateLocation,
  toggleLocationActive,
  bulkCreateLocations,
} from "@/actions/admin-actions";
import { formatDate } from "@/lib/constants";
import { toast } from "react-hot-toast";

interface LocationsTabProps {
  locations: Location[];
}

export default function LocationsTab({ locations }: LocationsTabProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
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
      setBulkError("Please enter a name for at least one location.");
      return;
    }

    startTransition(async () => {
      const res = await bulkCreateLocations(validRows);
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
        toast.success(`Locations created successfully.`);
      }
    });
  }

  function handleToggle(loc: Location) {
    startTransition(async () => {
      await toggleLocationActive(loc.id, !loc.isActive);
      toast.success(`Location ${loc.isActive ? "deactivated" : "activated"} successfully.`);
    });
  }

  async function handleCreate(fd: FormData) {
    startTransition(async () => {
      const res = await createLocation(fd);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setCreateOpen(false);
        toast.success("Location created successfully.");
      }
    });
  }

  async function handleEdit(fd: FormData) {
    startTransition(async () => {
      const res = await updateLocation(fd);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setEditTarget(null);
        toast.success("Location updated successfully.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold" style={{ fontSize: "0.9375rem" }}>Locations</div>
          <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
            Physical company branches
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setBulkOpen(true)}>
            Bulk Add
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            + Add location
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
            {locations.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                  No locations yet. Add one to get started.
                </td>
              </tr>
            )}
            {locations.map((loc) => (
              <tr
                key={loc.id}
                onClick={() => setEditTarget(loc)}
                style={{ cursor: "pointer" }}
              >
                <td className="font-medium">{loc.name}</td>
                <td><code style={{ fontSize: "0.8125rem" }}>{loc.code}</code></td>
                <td>
                  <span
                    className={`badge ${loc.isActive ? "badge-completed" : "badge-neutral"}`}
                  >
                    {loc.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-sub">
                  {formatDate(loc.createdAt)}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditTarget(loc)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={loc.isActive ? "danger" : "secondary"}
                      isLoading={isPending && editTarget?.id !== loc.id}
                      onClick={() => handleToggle(loc)}
                    >
                      {loc.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        title="Add location"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="create-location-form"
              isLoading={isPending}
            >
              Save
            </Button>
          </>
        }
      >
        <form
          id="create-location-form"
          action={handleCreate}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div className="field">
            <label htmlFor="loc-name">Location name</label>
            <input id="loc-name" name="name" type="text" placeholder="e.g. Nairobi Branch" required />
          </div>
          <div className="field">
            <label htmlFor="loc-code">Location code <span className="text-muted">(optional, e.g. NRB)</span></label>
            <input id="loc-code" name="code" type="text" placeholder="Auto-generated if left blank" style={{ textTransform: "uppercase" }} />
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit location"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="edit-location-form"
              isLoading={isPending}
            >
              Save changes
            </Button>
          </>
        }
      >
        {editTarget && (
          <form
            id="edit-location-form"
            action={handleEdit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <input type="hidden" name="id" value={editTarget.id} />
            <div className="field">
              <label htmlFor="loc-edit-name">Location name</label>
              <input
                id="loc-edit-name"
                name="name"
                type="text"
                defaultValue={editTarget.name}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="loc-edit-code">Location code</label>
              <input
                id="loc-edit-code"
                name="code"
                type="text"
                defaultValue={editTarget.code}
                required
                style={{ textTransform: "uppercase" }}
              />
            </div>
          </form>
        )}
      </Modal>

      {/* Bulk Add Locations Modal */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => { setBulkOpen(false); setBulkError(null); }}
        title="Bulk Add Locations"
        maxWidth="44rem"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" form="bulk-location-form" isLoading={isPending}>
              Save all ({bulkRows.length})
            </Button>
          </>
        }
      >
        <form id="bulk-location-form" onSubmit={handleBulkSubmit}>
          {bulkError && <div className="alert alert-error mb-4">{bulkError}</div>}
          <div className="alert alert-info mb-4" style={{ fontSize: "0.8125rem" }}>
            Add up to 50 locations. Duplicates by Location Code will be automatically skipped or flagged.
          </div>

          <div style={{ maxHeight: "24rem", overflowY: "auto", paddingRight: "0.5rem" }}>
            <div className="flex gap-2 font-semibold text-xs text-sub mb-2" style={{ paddingRight: "2rem" }}>
              <div style={{ flex: 2 }}>Location Name *</div>
              <div style={{ flex: 1.5 }}>Location Code (optional, e.g. NRB)</div>
            </div>

            {bulkRows.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  placeholder="e.g. Nairobi Branch"
                  value={row.name}
                  onChange={(e) => updateBulkRow(idx, "name", e.target.value)}
                  required={idx === 0}
                  style={{ flex: 2, padding: "0.375rem 0.5rem" }}
                />
                <input
                  type="text"
                  placeholder="e.g. NRB"
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
