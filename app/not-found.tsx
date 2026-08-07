import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-surface-2)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "5rem",
          fontWeight: 600,
          color: "var(--color-brand)",
          lineHeight: 1,
          marginBottom: "0.5rem",
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "var(--color-text)",
          marginBottom: "0.5rem",
        }}
      >
        Page not found
      </h1>
      <p style={{ color: "var(--color-text-sub)", marginBottom: "2rem", maxWidth: "28rem" }}>
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to access it.
      </p>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <Link
          href="/dashboard"
          className="btn btn-primary btn-sm"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="btn btn-secondary btn-sm"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
