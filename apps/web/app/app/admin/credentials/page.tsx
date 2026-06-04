import { apiGet, type CredentialWarning, type SessionSummary } from "@/lib/api";

export default async function CredentialWarningsPage() {
  const [session, warnings] = await Promise.all([
    apiGet<SessionSummary>("/auth/me"),
    apiGet<CredentialWarning[]>("/operations/credentials/warnings")
  ]);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Credentialing</p>
        <h1>Certification warnings</h1>
        <p>{session.displayName} can review credential warnings and verification risk in scope.</p>
      </div>
      <section className="panel">
        <div className="item-list">
          {warnings.length ? (
            warnings.map((warning) => (
              <article className="list-row" key={`${warning.employeeId}-${warning.certification}`}>
                <div>
                  <strong>{warning.employeeName}</strong>
                  <span>
                    {warning.certification} expires {warning.expiresAt ?? "not applicable"}
                  </span>
                </div>
                <span className="status-pill">{warning.status}</span>
              </article>
            ))
          ) : (
            <p className="empty-state">No credential warnings are visible for this role.</p>
          )}
        </div>
      </section>
    </section>
  );
}
