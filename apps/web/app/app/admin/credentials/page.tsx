import { apiGet, type CredentialWarning } from "@/lib/api";

export default async function CredentialWarningsPage() {
  const warnings = await apiGet<CredentialWarning[]>(
    "/operations/credentials/warnings",
    "user_admin"
  );

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Credentialing</p>
        <h1>Certification warnings</h1>
      </div>
      <section className="panel">
        <div className="item-list">
          {warnings.map((warning) => (
            <article className="list-row" key={`${warning.employeeId}-${warning.certification}`}>
              <div>
                <strong>{warning.employeeName}</strong>
                <span>
                  {warning.certification} expires {warning.expiresAt ?? "not applicable"}
                </span>
              </div>
              <span className="status-pill">{warning.status}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
