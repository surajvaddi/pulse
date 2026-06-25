import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, Users } from "lucide-react";

import {
  apiGetSession,
  type AssignmentCandidate,
  type AuditLog,
  type DemoShift,
  type ShiftPipelineApproval,
  type ShiftPipelineClaim,
  type ShiftPipelineSlot,
  type ShiftSwapRequest,
  type StaffingGap,
  type WorkspaceContext
} from "@/lib/api";
import { buildManagerDashboard } from "@/lib/manager-dashboard";
import { approveShiftClaimAction, decideCanonicalSwapAction, denyShiftClaimAction, directAssignShiftAction } from "../actions";
import { WorkflowNote } from "../workflow-note";

export default async function ManagerPage() {
  const [context, shifts, gaps, swaps, slots, claims, approvals] = await Promise.all([
    apiGetSession<WorkspaceContext>("/auth/workspace-context", "user_jordan_manager"),
    apiGetSession<DemoShift[]>("/demo/schedule/visible", "user_jordan_manager"),
    apiGetSession<StaffingGap[]>("/operations/staffing/gaps", "user_jordan_manager"),
    apiGetSession<ShiftSwapRequest[]>("/swap-pipeline/swaps?status=PENDING_MANAGER", "user_jordan_manager"),
    apiGetSession<ShiftPipelineSlot[]>("/shift-pipeline/slots?statuses=OPEN,CLAIM_PENDING", "user_jordan_manager"),
    apiGetSession<ShiftPipelineClaim[]>("/shift-pipeline/claims?statuses=PENDING_APPROVAL", "user_jordan_manager"),
    apiGetSession<ShiftPipelineApproval[]>("/shift-pipeline/approvals?status=PENDING", "user_jordan_manager")
  ]);
  const auditLogs: AuditLog[] = [];
  const activeUnit = context.units.find(
    (unit) => unit.id === context.activeSelection.unitId
  );
  const dashboard = buildManagerDashboard({ shifts, auditLogs, gaps, swaps, slots, claims, approvals });
  const candidateEntries = await Promise.all(
    dashboard.openSlots.map(async (slot) => [
      slot.id,
      await apiGetSession<AssignmentCandidate[]>(
        `/shift-pipeline/slots/${slot.id}/candidates`,
        "user_jordan_manager"
      )
    ] as const)
  );
  const candidatesBySlot = new Map(candidateEntries);
  const canOverride = context.roleGrants.some(
    (grant) => grant.permission === "shift:assign:override"
  );
  const icons = [Users, CheckCircle2, Clock3, AlertTriangle];

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Manager Dashboard</p>
        <h1>{activeUnit?.name ?? "Scoped operations"}</h1>
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
              <strong>{activeUnit?.name ?? "Unit"} {dashboard.priorityGap.role}</strong>
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
                <strong>Swap approval pending</strong>
                <span>
                  {swap.requesterEmployeeId} to {swap.proposedEmployeeId} · {swap.policyDecision.riskFlags.length} policy flags
                </span>
              </div>
              <form className="action-row" action={decideCanonicalSwapAction}>
                <input type="hidden" name="swapId" value={swap.id} />
                <input type="hidden" name="decision" value="approve" />
                <button className="command-button" type="submit">
                  Approve
                </button>
              </form>
              <form className="action-row" action={decideCanonicalSwapAction}>
                <input type="hidden" name="swapId" value={swap.id} />
                <input type="hidden" name="decision" value="deny" />
                <button className="secondary-button" type="submit">
                  Deny
                </button>
              </form>
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
                  <label htmlFor={`candidate-${slot.id}`}>Candidate</label>
                  <select id={`candidate-${slot.id}`} name="userId" defaultValue="" required>
                    <option value="" disabled>Select a candidate</option>
                    {(candidatesBySlot.get(slot.id) ?? []).map((candidate) => (
                      <option
                        key={candidate.userId}
                        value={candidate.userId}
                        disabled={candidate.eligibility === "BLOCKED"}
                      >
                        {candidate.displayName} - {candidate.eligibility.toLowerCase()}
                      </option>
                    ))}
                  </select>
                  {canOverride &&
                  (candidatesBySlot.get(slot.id) ?? []).some(
                    (candidate) => candidate.eligibility === "WARNING"
                  ) ? (
                    <input
                      name="overrideReason"
                      placeholder="Override reason for warning candidate"
                    />
                  ) : null}
                  <button className="command-button" type="submit">
                    Assign selected
                  </button>
                </form>
                <div className="detail-stack">
                  {(candidatesBySlot.get(slot.id) ?? []).map((candidate) => (
                    <div className="form-note" key={`${candidate.userId}-reason`}>
                      <strong>{candidate.displayName}</strong>
                      {candidate.reasons.length
                        ? `: ${candidate.reasons.join(" ")}`
                        : ": Eligible for assignment."}
                    </div>
                  ))}
                </div>
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
