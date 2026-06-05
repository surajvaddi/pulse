import { RotateCcw } from "lucide-react";

import { resetDemoAction } from "@/app/app/actions";
import { apiGet, type AIToolCall, type AuditLog, type SessionSummary } from "@/lib/api";

export default async function AdminAuditPage() {
  const session = await apiGet<SessionSummary>("/auth/me");
  const canReadAiToolCalls = session.permissions.includes("ai:admin") || session.permissions.includes("audit:read");
  const [auditLogs, toolCalls] = await Promise.all([
    apiGet<AuditLog[]>("/demo/audit"),
    canReadAiToolCalls ? apiGet<AIToolCall[]>("/demo/ai-tool-calls") : Promise.resolve([])
  ]);
  const canResetDemo =
    process.env.APP_ENV !== "production" &&
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_DEMO_RESET !== "false";

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Admin review</p>
        <h1>Audit and AI tool calls</h1>
        <p>{session.displayName} can review audit evidence available to this role.</p>
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
          {canResetDemo ? (
            <>
              <div className="section-heading">
                <h2>Demo controls</h2>
              </div>
              <form action={resetDemoAction} className="detail-stack">
                <button className="command-button" type="submit">
                  <RotateCcw size={16} aria-hidden="true" />
                  Reset demo state
                </button>
              </form>
            </>
          ) : null}

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
                    <span>
                      {toolCall.route ?? "UNROUTED"} · {toolCall.model ?? "mock"}
                    </span>
                    <span>
                      {toolCall.actorRole ?? "UNKNOWN_ROLE"} · {toolCall.latencyMs ?? 0}ms
                    </span>
                    <span>{toolCall.safetyStatus ?? toolCall.riskLevel}</span>
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
