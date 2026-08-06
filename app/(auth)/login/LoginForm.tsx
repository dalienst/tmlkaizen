"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_DASHBOARD } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const setupComplete = searchParams.get("setup") === "complete";
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setIsPending(false);
      return;
    }

    // Fetch session to get role
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role as UserRole | undefined;
    const destination = role ? ROLE_DASHBOARD[role] : "/dashboard";
    router.push(destination);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {setupComplete && (
        <div className="alert alert-success">
          Admin account created. Sign in below.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          name="email"
          type="email"
          placeholder="you@company.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          placeholder="Your password"
          required
          autoComplete="current-password"
        />
      </div>

      <div style={{ textAlign: "right", marginTop: "-0.5rem" }}>
        <a
          href="/reset-password"
          style={{ fontSize: "0.8125rem", color: "var(--color-brand)" }}
        >
          Forgot password?
        </a>
      </div>

      <button
        id="login-submit"
        type="submit"
        className="btn btn-primary w-full"
        disabled={isPending}
        style={{ marginTop: "0.25rem" }}
      >
        {isPending ? (
          <>
            <span className="spinner spinner-sm" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
