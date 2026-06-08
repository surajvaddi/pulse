import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, Users } from "lucide-react";

import {
  apiGet,
  type AuditLog,
  type DemoShift,
  type DemoSwap,
  type ShiftPipelineApproval,
  type ShiftPipelineClaim,
  type ShiftPipelineSlot,
  type StaffingGap
} from "@/lib/api";
import { buildManagerDashboard } from "@/lib/manager-dashboard";
import { approveShiftClaimAction, denyShiftClaimAction, directAssignShiftAction } from "../actions";
import { WorkflowNote } from "../workflow-note";

export default async function ManagerPage() {
  const [shifts, auditLogs, gaps, swaps, slots, claims, approvals] = await Promise.all([
    apiGet<DemoShift[]>("/demo/schedule/unit/unit_icu", "user_jordan_manager"),
    apiGet<AuditLog[]>("/demo/audit", "user_admin"),
    apiGet<StaffingGap[]>("/operations/staffing/gaps", "user_jordan_manager"),
    apiGet<DemoSwap[]>("/workflows/swaps", "user_jordan_manager"),
    apiGet<ShiftPipelineSlot[]>("/shift-pipeline/slots?unitId=unit_icu&statuses=OPEN,CLAIM_PENDING", "user_jordan_manager"),
    apiGet<ShiftPipelineClaim[]>("/shift-pipeline/claims?statuses=PENDING_APPROVAL", "user_jordan_manager"),
    apiGet<ShiftPipelineApproval[]>("/shift-pipeline/approvals?status=PENDING", "user_jordan_manager")
  ]);
  const dashboard = buildManagerDashboard({ shifts, auditLogs, gaps, swaps, slots, claims, approvals });
  const icons = [Users, CheckCircle2, Clock3, AlertTriangle];

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Manager Dashboard</p>
        <h1>ICU operations</h1>
        <p>Review coverage, approvals, staffing risk, and recent audit activity for your unit.</p>
      </div>
      <WorkflowNote route="/app/manager" role="UNIT_MANAGER" />
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
          <span>{dashboard.pendingSwaps.length + dashboard.pendingClaims.length} pending</span>
        </div>
        <div className="item-list">
          {dashboard.pendingSwaps.map((swap) => (
            <article className="list-row" key={swap.id}>
              <div>
                <strong>{swap.status.replaceAll("_", " ")}</strong>
                <span>{swap.riskFlags.length} policy flags</span>
              </div>
              <Link className="command-button" href="/app/swaps">
                Review swap
              </Link>
            </article>
          ))}
          {dashboard.pendingClaims.map((claim) => (
            <article className="list-row" key={claim.id}>
              <div>
                <strong>Shift claim pending</strong>
                <span>
                  {claim.employeeId} · {claim.policyDecision.riskFlags.length} policy flags
                </span>
              </div>
              <form className="action-row" action={approveShiftClaimAction}>
                <input type="hidden" name="claimId" value={claim.id} />
                <button className="command-button" type="submit">
                  Approve
                </button>
              </form>
              <form className="action-row" action={denyShiftClaimAction}>
                <input type="hidden" name="claimId" value={claim.id} />
                <button className="secondary-button" type="submit">
                  Deny
                </button>
              </form>
            </article>
          ))}
          {dashboard.pendingSwaps.length + dashboard.pendingClaims.length === 0 ? (
            <p className="empty-state">No manager approvals are waiting.</p>
          ) : null}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Coverage Actions</h2>
          <span>{dashboard.openSlots.length} open pipeline slots</span>
        </div>
        <div className="item-list">
          {dashboard.openSlots.length > 0 ? (
            dashboard.openSlots.map((slot) => (
              <article className="list-row" key={slot.id}>
                <div>
                  <strong>{slot.roleRequiredId.replaceAll("_", " ")}</strong>
                  <span>
                    {slot.startsAt.slice(0, 10)} · {slot.riskFlags.length > 0 ? slot.riskFlags.join(", ") : "No risk flags"}
                  </span>
                </div>
                <form action={directAssignShiftAction}>
                  <input type="hidden" name="slotId" value={slot.id} />
                  <input type="hidden" name="userId" value="user_maya" />
                  <button className="command-button" type="submit">
                    Assign Maya
                  </button>
                </form>
              </article>
            ))
          ) : (
            <p className="empty-state">No open pipeline slots need direct assignment.</p>
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
