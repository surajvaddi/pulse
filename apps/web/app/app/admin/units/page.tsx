import { PlusCircle } from "lucide-react";

import { createAdminUnitAction } from "@/app/app/actions";
import { apiGetSession, type AdminFacility, type AdminUnit } from "@/lib/api";

export default async function AdminUnitsPage() {
  const [units, facilities] = await Promise.all([
    apiGetSession<AdminUnit[]>("/admin/units", "user_admin"),
    apiGetSession<AdminFacility[]>("/admin/facilities", "user_admin")
  ]);

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Administration</p>
        <h1>Units</h1>
      </div>
      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <h2>Unit list</h2>
            <span>{units.length} units</span>
          </div>
          <div className="item-list">
            {units.length === 0 ? <p className="empty-state">No units yet. Create a facility first, then add units.</p> : null}
            {units.map((unit) => (
              <article className="list-row" key={unit.id}>
                <div>
                  <strong>{unit.name}</strong>
                  <span>{unit.type} · {unit.managerUserIds.join(", ") || "No manager"}</span>
                </div>
                <span className="status-pill">{unit.active ? "ACTIVE" : "INACTIVE"}</span>
              </article>
            ))}
          </div>
        </div>
        <aside className="panel">
          <div className="section-heading">
            <h2>Create unit</h2>
          </div>
          {facilities.length === 0 ? (
            <p className="empty-state">Create a facility before adding units.</p>
          ) : (
            <form action={createAdminUnitAction} className="detail-stack">
              <select name="facilityId" required>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>{facility.name}</option>
                ))}
              </select>
              <input name="name" placeholder="Unit name" required />
              <select name="type" defaultValue="OTHER">
                <option value="ICU">ICU</option>
                <option value="ED">ED</option>
                <option value="MED_SURG">Med-Surg</option>
                <option value="OTHER">Other</option>
              </select>
              <input name="managerUserIds" placeholder="Manager user ids, comma separated" />
              <input name="reason" placeholder="Audit reason" required />
              <button className="command-button" type="submit">
                <PlusCircle size={16} aria-hidden="true" />
                Create unit
              </button>
            </form>
          )}
        </aside>
      </section>
    </section>
  );
}
