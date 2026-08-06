"use client";

import { useState, useTransition } from "react";
import type { Location } from "@/db/schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  createLocation,
  updateLocation,
  toggleLocationActive,
} from "@/actions/admin-actions";

interface LocationsTabProps {
  locations: Location[];
}

export default function LocationsTab({ locations }: LocationsTabProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(loc: Location) {
    startTransition(async () => {
      await toggleLocationActive(loc.id, !loc.isActive);
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
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          + Add location
        </Button>
      </div>

      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ width: "8rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2rem" }}>
                  No locations yet. Add one to get started.
                </td>
              </tr>
            )}
            {locations.map((loc) => (
              <tr key={loc.id} onClick={() => setEditTarget(loc)} style={{ cursor: "pointer" }}>
                <td className="font-medium">{loc.name}</td>
                <td>
                  <span
                    className={`badge ${loc.isActive ? "badge-completed" : "badge-neutral"}`}
                  >
                    {loc.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-sub">
                  {new Date(loc.createdAt).toLocaleDateString()}
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
                      isLoading={isPending}
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
            >
              Save
            </Button>
          </>
        }
      >
        <form
          id="create-location-form"
          action={async (fd) => {
            await createLocation(fd);
            setCreateOpen(false);
          }}
        >
          <div className="field">
            <label htmlFor="loc-name">Location name</label>
            <input id="loc-name" name="name" type="text" placeholder="e.g. Nairobi Branch" required />
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
            >
              Save changes
            </Button>
          </>
        }
      >
        {editTarget && (
          <form
            id="edit-location-form"
            action={async (fd) => {
              await updateLocation(fd);
              setEditTarget(null);
            }}
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
          </form>
        )}
      </Modal>
    </div>
  );
}
