import { AlertTriangle, Clock3, ShieldCheck } from "lucide-react";

import {
  apiGetSession,
  type OpenShiftResult,
  type ShiftPipelineClaim
} from "@/lib/api";
import { buildOpenShiftCards } from "@/lib/shift-pipeline-view";
import { claimOpenShiftAction } from "../actions";
import { EmployeeEmptyState } from "../employee-empty-state";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OpenShiftsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const requested = await searchParams;
  const query = new URLSearchParams();
  for (const key of [
    "dateFrom",
    "dateTo",
    "roleId",
    "minDurationHours",
    "maxDurationHours",
    "qualification",
    "overtimeRisk"
  ]) {
    const value = valueOf(requested[key]);
    if (value) query.set(key, value);
  }
  const [results, claims] = await Promise.all([
    apiGetSession<OpenShiftResult[]>(
      `/shift-pipeline/open-slots${query.size ? `?${query}` : ""}`
    ),
    apiGetSession<ShiftPipelineClaim[]>("/shift-pipeline/claims")
  ]);
  const eligibilityBySlot = new Map(
    results.map((result) => [result.slot.id, result.eligibility])
  );
  const openShifts = buildOpenShiftCards(
    results.map((result) => result.slot),
    claims
  );

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Open Shifts</p>
        <h1>Available coverage opportunities</h1>
      </div>
      <form className="filter-bar" method="get">
        <label>
          From
          <input name="dateFrom" type="date" defaultValue={valueOf(requested.dateFrom)} />
        </label>
        <label>
          To
          <input name="dateTo" type="date" defaultValue={valueOf(requested.dateTo)} />
        </label>
        <label>
          Role ID
          <input name="roleId" placeholder="Any role" defaultValue={valueOf(requested.roleId)} />
        </label>
        <label>
          Minimum hours
          <input
            name="minDurationHours"
            type="number"
            min="1"
            step="0.5"
            defaultValue={valueOf(requested.minDurationHours)}
          />
        </label>
        <label>
          Maximum hours
          <input
            name="maxDurationHours"
            type="number"
            min="1"
            step="0.5"
            defaultValue={valueOf(requested.maxDurationHours)}
          />
        </label>
        <label className="check-label">
          <input
            name="qualification"
            type="checkbox"
            value="eligible"
            defaultChecked={valueOf(requested.qualification) === "eligible"}
          />{" "}
          Only shifts I qualify for
        </label>
        <label className="check-label">
          <input
            name="overtimeRisk"
            type="checkbox"
            value="exclude"
            defaultChecked={valueOf(requested.overtimeRisk) === "exclude"}
          />{" "}
          No overtime risk
        </label>
        <button className="secondary-button" type="submit">
          Apply filters
        </button>
      </form>
      {openShifts.length === 0 ? (
        <EmployeeEmptyState kind="NO_AVAILABLE_SHIFTS" />
      ) : null}
      <div className="dashboard-grid">
        {openShifts.map((shift) => {
          const eligibility = eligibilityBySlot.get(shift.id);
          const blocked = eligibility?.eligibility === "BLOCKED";
          return (
            <article className="metric-card" key={shift.id}>
              {shift.statusTone === "pending" ? <Clock3 size={20} /> : <ShieldCheck size={20} />}
              <p>{shift.unitLabel}</p>
              <strong>{shift.roleLabel} · {shift.dateLabel}</strong>
              <span>{shift.timeLabel}</span>
              <span>{shift.certificationLabel}</span>
              <span className={`status-pill status-pill-${shift.statusTone}`}>{shift.statusLabel}</span>
              <span className="risk-line">
                <AlertTriangle size={14} /> {shift.riskLabel}
              </span>
              {eligibility?.reasons.map((reason) => (
                <span className="risk-line" key={reason}>{reason}</span>
              ))}
              <form action={claimOpenShiftAction}>
                <input type="hidden" name="shiftId" value={shift.id} />
                <button
                  className="command-button"
                  type="submit"
                  disabled={!shift.canClaim || blocked}
                >
                  {blocked ? "Not eligible" : shift.claimButtonLabel}
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
}
