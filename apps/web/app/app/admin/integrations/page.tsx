import { RefreshCw, UploadCloud } from "lucide-react";

import { runIntegrationSyncAction } from "@/app/app/actions";
import {
  apiGet,
  type IntegrationConnection,
  type IntegrationImportPreview,
  type IntegrationSyncRun
} from "@/lib/api";

function formatDate(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function IntegrationsPage() {
  const connections = await apiGet<IntegrationConnection[]>("/integrations", "user_admin");
  const primaryConnection = connections[0];
  const [syncRuns, importPreview] = await Promise.all([
    primaryConnection
      ? apiGet<IntegrationSyncRun[]>(`/integrations/${primaryConnection.id}/sync-runs`, "user_admin")
      : Promise.resolve([]),
    primaryConnection
      ? apiGet<IntegrationImportPreview>(
          `/integrations/${primaryConnection.id}/import-preview`,
          "user_admin"
        )
      : Promise.resolve(null)
  ]);

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Integrations</p>
        <h1>Workforce system sync</h1>
      </div>

      <section className="dashboard-grid">
        {connections.map((connection) => (
          <article className="metric-card" key={connection.id}>
            <span>{connection.system}</span>
            <strong>{connection.displayName}</strong>
            <span>{connection.direction} sync</span>
            <span>Last sync {formatDate(connection.lastSyncAt)}</span>
            <span className="status-pill">{connection.status}</span>
          </article>
        ))}
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <h2>Sync runs</h2>
            <span>{syncRuns.length} recorded</span>
          </div>
          <div className="item-list">
            {syncRuns.map((run) => (
              <article className="list-row" key={run.id}>
                <div>
                  <strong>{run.summary}</strong>
                  <span>
                    {run.imported} imported, {run.exported} exported, {run.failed} failed
                  </span>
                  <span>{formatDate(run.finishedAt)}</span>
                </div>
                <span className="status-pill">{run.status}</span>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel">
          <div className="section-heading">
            <h2>Manual controls</h2>
          </div>
          {primaryConnection ? (
            <form action={runIntegrationSyncAction} className="detail-stack">
              <input type="hidden" name="integrationId" value={primaryConnection.id} />
              <label className="check-label" htmlFor="direction">
                Direction
              </label>
              <select id="direction" name="direction" defaultValue={primaryConnection.direction}>
                <option value="BIDIRECTIONAL">Bidirectional</option>
                <option value="IMPORT">Import only</option>
                <option value="EXPORT">Export only</option>
              </select>
              <button className="command-button" type="submit">
                <RefreshCw size={16} aria-hidden="true" />
                Run sync
              </button>
            </form>
          ) : (
            <p className="empty-state">No integration is configured.</p>
          )}
        </aside>
      </section>

      {importPreview ? (
        <section className="panel">
          <div className="section-heading">
            <h2>CSV import preview</h2>
            <span>
              {importPreview.acceptedRows} accepted, {importPreview.rejectedRows} rejected
            </span>
          </div>
          <div className="item-list">
            {importPreview.rows.map((row) => (
              <article className="list-row" key={`${row.rowNumber}-${row.externalId}`}>
                <div>
                  <strong>
                    Row {row.rowNumber}: {row.recordType}
                  </strong>
                  <span>{row.message}</span>
                  <span>{row.externalId}</span>
                </div>
                <span className="status-pill">{row.status}</span>
              </article>
            ))}
          </div>
          <div className="action-row">
            <button className="command-button" type="button">
              <UploadCloud size={16} aria-hidden="true" />
              Import accepted rows
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
