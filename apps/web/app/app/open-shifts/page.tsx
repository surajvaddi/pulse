import { ShieldCheck } from "lucide-react";

import { apiGet, type DemoShift } from "@/lib/api";
import { claimOpenShiftAction } from "../actions";

export default async function OpenShiftsPage() {
  const openShifts = await apiGet<DemoShift[]>("/workflows/open-shifts");

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
            <ShieldCheck size={20} />
            <p>ICU</p>
            <strong>{shift.title}</strong>
            <span>Requires ACLS and ICU Qualified</span>
            <form action={claimOpenShiftAction}>
              <input type="hidden" name="shiftId" value={shift.id} />
              <input type="hidden" name="userId" value="user_priya" />
              <button className="command-button" type="submit">
                Claim shift
              </button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
