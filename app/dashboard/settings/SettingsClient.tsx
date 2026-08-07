"use client";

import { useState, useTransition } from "react";
import { updateUserProfile } from "@/actions/manager-actions";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";

interface Props {
  user: { name: string; email: string };
}

export default function SettingsClient({ user }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      const res = await updateUserProfile(fd);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Profile updated successfully.");
        setShowPasswordFields(false);
      }
    });
  }

  return (
    <div style={{ maxWidth: "32rem" }}>
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="font-semibold" style={{ marginBottom: "1rem" }}>Profile</div>
        <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="settings-name">Full name</label>
            <input id="settings-name" name="name" type="text" defaultValue={user.name} required />
          </div>
          <div className="field">
            <label htmlFor="settings-email">Email address</label>
            <input
              id="settings-email"
              name="email"
              type="email"
              defaultValue={user.email}
              disabled
              style={{ background: "var(--color-muted)", cursor: "not-allowed" }}
            />
            <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
              Email cannot be changed. Contact your system administrator.
            </div>
          </div>

          {!showPasswordFields && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: "flex-start" }}
              onClick={() => setShowPasswordFields(true)}
            >
              Change password…
            </button>
          )}

          {showPasswordFields && (
            <>
              <div className="field">
                <label htmlFor="settings-current-pw">Current password</label>
                <input id="settings-current-pw" name="currentPassword" type="password" autoComplete="current-password" />
              </div>
              <div className="field">
                <label htmlFor="settings-new-pw">New password <span className="text-muted">(min. 8 characters)</span></label>
                <input id="settings-new-pw" name="newPassword" type="password" autoComplete="new-password" minLength={8} />
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: "flex-start" }}
                onClick={() => setShowPasswordFields(false)}
              >
                Cancel password change
              </button>
            </>
          )}

          <div>
            <Button variant="primary" size="sm" type="submit" isLoading={isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
