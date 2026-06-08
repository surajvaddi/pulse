import { AlertTriangle, Clock3, ShieldCheck } from "lucide-react";

import { apiGet, type ShiftPipelineClaim, type ShiftPipelineSlot } from "@/lib/api";
import { buildOpenShiftCards } from "@/lib/shift-pipeline-view";
import { claimOpenShiftAction } from "../actions";

export default async function OpenShiftsPage() {
  const [slots, claims] = await Promise.all([
    apiGet<ShiftPipelineSlot[]>("/shift-pipeline/slots?statuses=OPEN,CLAIM_PENDING"),
    apiGet<ShiftPipelineClaim[]>("/shift-pipeline/claims")
  ]);
  const openShifts = buildOpenShiftCards(slots, claims);

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Open Shifts</p>
        <h1>Qualified ICU coverage opportunities</h1>
      </div>
      <div className="filter-bar">
        <select aria-label="Date">
          <option>This week</option>
        </select>
        <select aria-label="Role">
          <option>RN</option>
        </select>
        <label className="check-label">
          <input type="checkbox" defaultChecked /> Only shifts I qualify for
        </label>
        <label className="check-label">
          <input type="checkbox" /> No overtime risk
        </label>
      </div>
      <div className="dashboard-grid">
        {openShifts.map((shift) => (
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
            <form action={claimOpenShiftAction}>
              <input type="hidden" name="shiftId" value={shift.id} />
              <input type="hidden" name="userId" value="user_priya" />
              <button className="command-button" type="submit" disabled={!shift.canClaim}>
                {shift.claimButtonLabel}
              </button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
