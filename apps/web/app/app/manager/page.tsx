import { AlertTriangle, CheckCircle2, Clock3, Users } from "lucide-react";

import { apiGet, type AuditLog, type DemoShift } from "@/lib/api";

export default async function ManagerPage() {
  const shifts = await apiGet<DemoShift[]>("/demo/schedule/unit/unit_icu", "user_jordan_manager");
  const auditLogs = await apiGet<AuditLog[]>("/demo/audit", "user_admin");
  const openCount = shifts.filter((shift) => shift.status === "OPEN").length;

  const cards = [
    { title: "ICU Coverage Tonight", value: "RN: 1 / 2 required", detail: "Short one RN", icon: Users },
    { title: "Pending Approvals", value: "0 swaps", detail: "Approval queue ready", icon: CheckCircle2 },
    { title: "Open Shifts", value: String(openCount), detail: "ICU night coverage", icon: Clock3 },
    { title: "Overtime Risk", value: "1 warning", detail: "Review before assignment", icon: AlertTriangle }
  ];

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Manager Dashboard</p>
        <h1>ICU operations</h1>
      </div>
      <div className="dashboard-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="metric-card" key={card.title}>
              <Icon size={20} />
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
          <span>Computed from seeded requirements</span>
        </div>
        <article className="list-row">
          <div>
            <strong>ICU RN Night</strong>
            <span>Required: 2, assigned: 1, gap: 1</span>
          </div>
          <button className="command-button">Find coverage</button>
        </article>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Audit Trail</h2>
          <span>{auditLogs.length} records</span>
        </div>
        <div className="item-list">
          {auditLogs.slice(-4).map((log) => (
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
