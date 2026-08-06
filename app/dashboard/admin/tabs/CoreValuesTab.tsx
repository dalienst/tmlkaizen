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
                  No core values yet.
                </td>
              </tr>
            )}
            {coreValues.map((cv) => (
              <tr key={cv.id}>
                <td className="text-sub text-center">{cv.sortOrder}</td>
                <td className="font-medium">{cv.name}</td>
                <td className="text-sub">
                  {cv.description ?? <span style={{ color: "var(--color-text-muted)" }}>—</span>}
                </td>
                <td>
                  <span className={`badge ${cv.isActive ? "badge-completed" : "badge-neutral"}`}>
                    {cv.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditTarget(cv)}>Edit</Button>
                    <Button
                      size="sm"
                      variant={cv.isActive ? "danger" : "secondary"}
                      isLoading={isPending}
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
            <Button variant="primary" size="sm" type="submit" form="create-cv-form">Save</Button>
          </>
        }
      >
        <form
          id="create-cv-form"
          action={async (fd) => { await createCoreValue(fd); setCreateOpen(false); }}
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
            <Button variant="primary" size="sm" type="submit" form="edit-cv-form">Save changes</Button>
          </>
        }
      >
        {editTarget && (
          <form
            id="edit-cv-form"
            action={async (fd) => { await updateCoreValue(fd); setEditTarget(null); }}
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
