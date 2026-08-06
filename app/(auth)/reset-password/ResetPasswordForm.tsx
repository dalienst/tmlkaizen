"use client";

import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { forgotPassword, resetPassword } from "@/actions/auth-actions";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ── Forgot Password Request ────────────────────────────────────────────────
  async function handleForgotSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await forgotPassword(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
      }
    });
  }

  // ── Reset Password Request ──────────────────────────────────────────────────
  async function handleResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    if (token) {
      fd.set("token", token);
    }

    startTransition(async () => {
      const res = await resetPassword(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    });
  }

  if (!token) {
    // Request flow (Forgot Password)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {success ? (
          <div className="alert alert-success" style={{ fontSize: "0.875rem" }}>
            If the email is registered, a password reset link has been sent to it.
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="field">
              <label htmlFor="reset-email">Email address</label>
              <input
                id="reset-email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              isLoading={isPending}
              className="w-full"
            >
              Send reset link
            </Button>
          </form>
        )}
        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <a
            href="/login"
            style={{ fontSize: "0.8125rem", color: "var(--color-brand)" }}
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  // Action flow (Reset Password with token)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {success ? (
        <div className="alert alert-success" style={{ fontSize: "0.875rem" }}>
          Password has been reset successfully. Redirecting to login…
        </div>
      ) : (
        <form onSubmit={handleResetSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="field">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              name="confirm"
              type={showPassword ? "text" : "password"}
              placeholder="Repeat new password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", marginTop: "0.375rem", color: "var(--color-text-sub)", cursor: "pointer", fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
                style={{ width: "auto", appearance: "auto" }}
              />
              Show passwords
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            className="w-full"
          >
            Reset password
          </Button>
        </form>
      )}
    </div>
  );
}
