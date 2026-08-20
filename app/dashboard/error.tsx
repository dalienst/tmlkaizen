"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to the console
    console.error("Dashboard error boundary caught error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        minHeight: "60vh",
        textAlign: "center",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "32rem",
          padding: "2.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            width: "3.5rem",
            height: "3.5rem",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.1)",
            color: "var(--color-danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.75rem",
            marginBottom: "0.25rem",
          }}
        >
          ⚠️
        </div>

        <h2 className="font-semibold" style={{ fontSize: "1.125rem", color: "var(--color-text)" }}>
          An unexpected error occurred
        </h2>

        <p className="text-muted" style={{ fontSize: "0.875rem", lineHeight: "1.5" }}>
          This could be due to a session mismatch or database casting error (often caused when database connections are switched). Clearing your session and logging back in will reset your cookies.
        </p>

        {error.message && (
          <div
            style={{
              width: "100%",
              background: "var(--color-muted)",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              textAlign: "left",
              maxHeight: "6rem",
              overflowY: "auto",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)",
            }}
          >
            {error.message}
          </div>
        )}

        <div className="flex gap-3" style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => reset()}
          >
            Try Again
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Clear Session & Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
