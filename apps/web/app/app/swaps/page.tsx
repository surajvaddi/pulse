import { apiGet, type OperationalShift, type ShiftSwapCandidate, type ShiftSwapRequest } from "@/lib/api";
import { createCanonicalSwapAction, respondCanonicalSwapAction } from "../actions";

const tabs = ["Start Swap", "Requests For Me", "Waiting On Manager", "History"];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function labelStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default async function SwapsPage() {
  const [swappableShifts, swaps] = await Promise.all([
    apiGet<OperationalShift[]>("/swap-pipeline/eligible-original-shifts"),
    apiGet<ShiftSwapRequest[]>("/swap-pipeline/swaps")
  ]);
  const candidatePairs = await Promise.all(
    swappableShifts.map(async (shift) => ({
      shift,
      candidates: await apiGet<ShiftSwapCandidate[]>(`/swap-pipeline/shifts/${shift.slotId}/candidates`)
    }))
  );
  const requestsForMe = swaps.filter((swap) => swap.status === "PENDING_COUNTERPARTY");
  const managerQueue = swaps.filter((swap) => swap.status === "PENDING_MANAGER");
  const history = swaps.filter((swap) => ["APPROVED", "DENIED", "CANCELLED", "EXPIRED"].includes(swap.status));

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Swap Center</p>
        <h1>Shift swap requests</h1>
        <p className="muted-text">
          Pick one of your assigned shifts, choose an eligible coworker, then wait for their acceptance and manager approval.
        </p>
      </div>
      <div className="tab-row">
        {tabs.map((tab) => (
          <button className="tab-button" key={tab}>
            {tab}
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Start Swap</p>
            <h2>Your swappable shifts</h2>
          </div>
          <span>{swappableShifts.length} available</span>
        </div>
        {candidatePairs.length === 0 ? (
          <p className="empty-state">No assigned future shifts are currently eligible for swapping.</p>
        ) : (
          <div className="item-list">
            {candidatePairs.map(({ shift, candidates }) => {
              const eligibleCandidates = candidates.filter((candidate) => candidate.eligible);
              const blockedCandidates = candidates.filter((candidate) => !candidate.eligible);
              return (
                <article className="list-row" key={shift.slotId}>
                  <div className="detail-stack">
                    <strong>{formatDateTime(shift.startsAt)}</strong>
                    <span>
                      {shift.unitId.replace("unit_", "").toUpperCase()} · {shift.roleRequiredId.replace("role_", "").replaceAll("_", " ")}
                    </span>
                    {shift.riskFlags.length > 0 ? (
                      <span className="risk-strip">{shift.riskFlags.map((flag) => flag.replaceAll("_", " ")).join(", ")}</span>
                    ) : null}
                  </div>
                  <div className="detail-stack">
                    <span className="muted-text">Eligible coworkers</span>
                    {eligibleCandidates.length === 0 ? (
                      <span>No eligible coworkers found.</span>
                    ) : (
                      <div className="action-row">
                        {eligibleCandidates.map((candidate) => (
                          <form action={createCanonicalSwapAction} key={candidate.userId}>
                            <input type="hidden" name="requesterUserId" value="user_priya" />
                            <input type="hidden" name="originalSlotId" value={shift.slotId} />
                            <input type="hidden" name="proposedUserId" value={candidate.userId} />
                            <button className="command-button" type="submit">
                              Ask {candidate.displayName}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                    {blockedCandidates.length > 0 ? (
                      <span className="muted-text">
                        Blocked:{" "}
                        {blockedCandidates
                          .slice(0, 2)
                          .map((candidate) => `${candidate.displayName} (${candidate.blockingReasons[0] ?? "policy blocked"})`)
                          .join("; ")}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Requests For Me</p>
            <h2>Counterparty response</h2>
          </div>
          <span>{requestsForMe.length} waiting</span>
        </div>
        {requestsForMe.length === 0 ? (
          <p className="empty-state">No coworkers are waiting on your swap response.</p>
        ) : (
          <div className="item-list">
            {requestsForMe.map((swap) => (
              <article className="list-row" key={swap.id}>
                <div className="detail-stack">
                  <strong>{swap.id}</strong>
                  <span>{labelStatus(swap.status)}</span>
                  <span className="muted-text">Original slot {swap.originalSlotId}</span>
                </div>
                <div className="action-row">
                  <form action={respondCanonicalSwapAction}>
                    <input type="hidden" name="swapId" value={swap.id} />
                    <input type="hidden" name="userId" value={swap.proposedUserId} />
                    <input type="hidden" name="decision" value="accept" />
                    <button className="command-button" type="submit">
                      Accept
                    </button>
                  </form>
                  <form action={respondCanonicalSwapAction}>
                    <input type="hidden" name="swapId" value={swap.id} />
                    <input type="hidden" name="userId" value={swap.proposedUserId} />
                    <input type="hidden" name="decision" value="decline" />
                    <button className="secondary-button" type="submit">
                      Decline
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Waiting On Manager</p>
            <h2>Approval queue</h2>
          </div>
          <span>{managerQueue.length} pending</span>
        </div>
        {managerQueue.length === 0 ? (
          <p className="empty-state">No accepted swaps are waiting for manager approval.</p>
        ) : (
          <div className="item-list">
            {managerQueue.map((swap) => (
              <article className="list-row" key={swap.id}>
                <div className="detail-stack">
                  <strong>{swap.id}</strong>
                  <span>{labelStatus(swap.status)}</span>
                </div>
                <span className="risk-strip">
                  {swap.policyDecision.riskFlags.map((flag) => flag.replaceAll("_", " ")).join(", ")}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">History</p>
            <h2>Completed requests</h2>
          </div>
          <span>{history.length} closed</span>
        </div>
        {history.length === 0 ? (
          <p className="empty-state">No completed swap requests yet.</p>
        ) : (
          <div className="item-list">
            {history.map((swap) => (
              <article className="list-row" key={swap.id}>
                <strong>{swap.id}</strong>
                <span>{labelStatus(swap.status)}</span>
                <span className="muted-text">{swap.decidedAt ? formatDateTime(swap.decidedAt) : formatDateTime(swap.createdAt)}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
