"use client";

import { useState, useTransition } from "react";
import type { CoreValue } from "@/db/schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  createCoreValue,
  updateCoreValue,
  toggleCoreValueActive,
} from "@/actions/admin-actions";
import { toast } from "react-hot-toast";

interface CoreValuesTabProps {
  coreValues: CoreValue[];
}

export default function CoreValuesTab({ coreValues }: CoreValuesTabProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CoreValue | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(cv: CoreValue) {
    startTransition(async () => {
      await toggleCoreValueActive(cv.id, !cv.isActive);
      toast.success(`Core value ${cv.isActive ? "deactivated" : "activated"} successfully.`);
    });
  }

  async function handleCreate(fd: FormData) {
    startTransition(async () => {
      const res = await createCoreValue(fd);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setCreateOpen(false);
        toast.success("Core value created successfully.");
      }
    });
  }

  async function handleEdit(fd: FormData) {
    startTransition(async () => {
      const res = await updateCoreValue(fd);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setEditTarget(null);
        toast.success("Core value updated successfully.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold" style={{ fontSize: "0.9375rem" }}>Core Values</div>
          <div className="text-sub" style={{ fontSize: "0.8125rem" }}>
            These appear as checkboxes on the employee submission form.
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          + Add core value
        </Button>
      </div>

      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th style={{ width: "3rem" }}>Order</th>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th style={{ width: "8rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coreValues.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                  No core values yet. Add one to define your focus areas.
                </td>
              </tr>
            )}
            {coreValues.map((cv) => (
              <tr
                key={cv.id}
                onClick={() => setEditTarget(cv)}
                style={{ cursor: "pointer" }}
              >
                <td><span className="text-muted">{cv.sortOrder}</span></td>
                <td className="font-medium">{cv.name}</td>
                <td className="text-sub" style={{ maxWidth: "20rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cv.description || <span className="text-muted">—</span>}
                </td>
                <td>
                  <span
                    className={`badge ${cv.isActive ? "badge-completed" : "badge-neutral"}`}
                  >
                    {cv.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditTarget(cv)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={cv.isActive ? "danger" : "secondary"}
                      isLoading={isPending && editTarget?.id !== cv.id}
                      onClick={() => handleToggle(cv)}
                    >
                      {cv.isActive ? "Deactivate" : "Activate"}
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
        title="Add core value"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="create-cv-form"
              isLoading={isPending}
            >
              Save
            </Button>
          </>
        }
      >
        <form
          id="create-cv-form"
          action={handleCreate}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div className="field">
            <label htmlFor="cv-name">Name</label>
            <input id="cv-name" name="name" type="text" placeholder="e.g. Integrity" required />
          </div>
          <div className="field">
            <label htmlFor="cv-desc">Description <span className="text-muted">(optional)</span></label>
            <textarea id="cv-desc" name="description" placeholder="Brief description…" style={{ minHeight: "4rem" }} />
          </div>
          <div className="field">
            <label htmlFor="cv-order">Display order</label>
            <input id="cv-order" name="sortOrder" type="number" defaultValue={coreValues.length} min={0} />
          </div>
        </form>
      </Modal>

      {/* Edit */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit core value"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="edit-cv-form"
              isLoading={isPending}
            >
              Save changes
            </Button>
          </>
        }
      >
        {editTarget && (
          <form
            id="edit-cv-form"
            action={handleEdit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <input type="hidden" name="id" value={editTarget.id} />
            <div className="field">
              <label htmlFor="cv-edit-name">Name</label>
              <input id="cv-edit-name" name="name" type="text" defaultValue={editTarget.name} required />
            </div>
            <div className="field">
              <label htmlFor="cv-edit-desc">Description</label>
              <textarea id="cv-edit-desc" name="description" defaultValue={editTarget.description ?? ""} style={{ minHeight: "4rem" }} />
            </div>
            <div className="field">
              <label htmlFor="cv-edit-order">Display order</label>
              <input id="cv-edit-order" name="sortOrder" type="number" defaultValue={editTarget.sortOrder} min={0} />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
