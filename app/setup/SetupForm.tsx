"use client";

import { useActionState, useState } from "react";
import { registerFirstAdmin } from "./actions";

const initialState = { error: "" };

export default function SetupForm() {
  const [state, formAction, isPending] = useActionState(
    registerFirstAdmin,
    initialState
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {state?.error && (
        <div className="alert alert-error">{state.error}</div>
      )}

      <div className="field">
        <label htmlFor="setup-name">Full name</label>
        <input
          id="setup-name"
          name="name"
          type="text"
          placeholder="Jane Doe"
          required
          autoComplete="name"
        />
      </div>

      <div className="field">
        <label htmlFor="setup-email">Email address</label>
        <input
          id="setup-email"
          name="email"
          type="email"
          placeholder="admin@company.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="setup-password">Password</label>
        <input
          id="setup-password"
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Min. 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className="field">
        <label htmlFor="setup-confirm">Confirm password</label>
        <input
          id="setup-confirm"
          name="confirm"
          type={showPassword ? "text" : "password"}
          placeholder="Repeat password"
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
          Show password
        </label>
      </div>

      <button
        id="setup-submit"
        type="submit"
        className="btn btn-primary w-full"
        disabled={isPending}
        style={{ marginTop: "0.5rem" }}
      >
        {isPending ? (
          <>
            <span className="spinner spinner-sm" />
            Creating account…
          </>
        ) : (
          "Create admin account"
        )}
      </button>
    </form>
  );
}
