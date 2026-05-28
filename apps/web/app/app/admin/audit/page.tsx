import { RotateCcw } from "lucide-react";

import { resetDemoAction } from "@/app/app/actions";
import { apiGet, type AIToolCall, type AuditLog } from "@/lib/api";

export default async function AdminAuditPage() {
  const [auditLogs, toolCalls] = await Promise.all([
    apiGet<AuditLog[]>("/demo/audit", "user_admin"),
    apiGet<AIToolCall[]>("/demo/ai-tool-calls", "user_admin")
  ]);

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Admin review</p>
        <h1>Audit and AI tool calls</h1>
      </div>

      <section className="dashboard-grid">
        <article className="metric-card">
          <span>Audit events</span>
          <strong>{auditLogs.length}</strong>
          <span>Seed and workflow records</span>
        </article>
        <article className="metric-card">
          <span>AI tool calls</span>
          <strong>{toolCalls.length}</strong>
          <span>Copilot tool execution log</span>
        </article>
        <article className="metric-card">
          <span>Blocked tools</span>
          <strong>{toolCalls.filter((toolCall) => toolCall.status === "BLOCKED").length}</strong>
          <span>Unsafe requests denied</span>
        </article>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <h2>Audit trail</h2>
            <span>{auditLogs.length} records</span>
          </div>
          <div className="item-list">
            {auditLogs.map((log) => (
              <article className="list-row" key={log.id}>
                <div>
                  <strong>{log.action}</strong>
                  <span>
                    {log.objectType} · {log.objectId}
                  </span>
                  <span>{log.reason ?? log.createdAt}</span>
                </div>
                <span className="status-pill">{log.actorType}</span>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel">
          <div className="section-heading">
            <h2>Demo controls</h2>
          </div>
          <form action={resetDemoAction} className="detail-stack">
            <button className="command-button" type="submit">
              <RotateCcw size={16} aria-hidden="true" />
              Reset demo state
            </button>
          </form>

          <div className="section-heading">
            <h2>AI tool calls</h2>
            <span>{toolCalls.length} records</span>
          </div>
          <div className="item-list">
            {toolCalls.length ? (
              toolCalls.map((toolCall) => (
                <article className="list-row" key={toolCall.id}>
                  <div>
                    <strong>{toolCall.toolName}</strong>
                    <span>{toolCall.userId}</span>
                    <span>{toolCall.riskLevel}</span>
                  </div>
                  <span className="status-pill">{toolCall.status}</span>
                </article>
              ))
            ) : (
              <p className="empty-state">No AI tool calls have been recorded since reset.</p>
            )}
          </div>
        </aside>
      </section>
    </section>
  );
}
