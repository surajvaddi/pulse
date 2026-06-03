import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: 24,
        padding: "32px min(5vw, 64px)"
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16
        }}
      >
        <strong style={{ fontSize: 20 }}>PulseShift</strong>
        <Link href="/login" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
          Open app
        </Link>
      </header>

      <section
        style={{
          alignSelf: "center",
          maxWidth: 920,
          display: "grid",
          gap: 28
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ color: "var(--accent-strong)", fontWeight: 700, margin: 0 }}>
            Healthcare workforce command center
          </p>
          <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1, margin: 0 }}>
            Scheduling workflows with scoped AI assistance.
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 18, lineHeight: 1.6, margin: 0 }}>
            PulseShift combines deterministic shift operations, policy checks, approval routing,
            notifications, audit logs, and a permission-aware copilot.
          </p>
        </div>
      </section>
    </main>
  );
}
