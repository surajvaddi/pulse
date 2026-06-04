import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, Users } from "lucide-react";

import { apiGet, type AuditLog, type DemoShift, type DemoSwap, type StaffingGap } from "@/lib/api";
import { buildManagerDashboard } from "@/lib/manager-dashboard";

export default async function ManagerPage() {
  const [shifts, auditLogs, gaps, swaps] = await Promise.all([
    apiGet<DemoShift[]>("/demo/schedule/unit/unit_icu", "user_jordan_manager"),
    apiGet<AuditLog[]>("/demo/audit", "user_admin"),
    apiGet<StaffingGap[]>("/operations/staffing/gaps", "user_jordan_manager"),
    apiGet<DemoSwap[]>("/workflows/swaps", "user_jordan_manager")
  ]);
  const dashboard = buildManagerDashboard({ shifts, auditLogs, gaps, swaps });
  const icons = [Users, CheckCircle2, Clock3, AlertTriangle];

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Manager Dashboard</p>
        <h1>ICU operations</h1>
        <p>Review coverage, approvals, staffing risk, and recent audit activity for your unit.</p>
      </div>
      <div className="dashboard-grid">
        {dashboard.cards.map((card, index) => {
          const Icon = icons[index] ?? Users;
          return (
            <article className={`metric-card metric-card-${card.tone}`} key={card.title}>
              <Icon size={20} aria-hidden="true" />
              <p>{card.title}</p>
              <strong>{card.value}</strong>
              <span>{card.detail}</span>
            </article>
          );
        })}
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>Staffing Gaps</h2>
          <span>{gaps.length} computed</span>
        </div>
        {dashboard.priorityGap ? (
          <article className="list-row">
            <div>
              <strong>ICU {dashboard.priorityGap.role}</strong>
              <span>
                Required {dashboard.priorityGap.requiredCount}, assigned{" "}
                {dashboard.priorityGap.assignedCount}, gap {dashboard.priorityGap.gapCount}
              </span>
            </div>
            <Link className="command-button" href="/app/staffing-gaps">
              Find coverage
            </Link>
          </article>
        ) : (
          <p className="empty-state">No staffing gaps are currently visible.</p>
        )}
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Approvals</h2>
          <span>{dashboard.pendingSwaps.length} pending</span>
        </div>
        <div className="item-list">
          {dashboard.pendingSwaps.length > 0 ? (
            dashboard.pendingSwaps.map((swap) => (
              <article className="list-row" key={swap.id}>
                <div>
                  <strong>{swap.status.replaceAll("_", " ")}</strong>
                  <span>{swap.riskFlags.length} policy flags</span>
                </div>
                <Link className="command-button" href="/app/swaps">
                  Review swap
                </Link>
              </article>
            ))
          ) : (
            <p className="empty-state">No manager approvals are waiting.</p>
          )}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Audit Trail</h2>
          <span>{auditLogs.length} records</span>
        </div>
        <div className="item-list">
          {dashboard.recentAuditLogs.map((log) => (
            <article className="list-row" key={log.id}>
              <div>
                <strong>{log.action}</strong>
                <span>
                  {log.objectType}: {log.objectId}
                </span>
              </div>
              <span className="status-pill">{log.actorType}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
