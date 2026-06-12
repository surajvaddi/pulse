import { PlusCircle } from "lucide-react";

import { createAdminFacilityAction } from "@/app/app/actions";
import { apiGetSession, type AdminFacility } from "@/lib/api";

export default async function AdminFacilitiesPage() {
  const facilities = await apiGetSession<AdminFacility[]>("/admin/facilities", "user_admin");

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Administration</p>
        <h1>Facilities</h1>
      </div>
      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <h2>Facility list</h2>
            <span>{facilities.length} configured</span>
          </div>
          <div className="item-list">
            {facilities.map((facility) => (
              <article className="list-row" key={facility.id}>
                <div>
                  <strong>{facility.name}</strong>
                  <span>{facility.timezone}</span>
                </div>
                <span className="status-pill">{facility.status}</span>
              </article>
            ))}
          </div>
        </div>
        <aside className="panel">
          <div className="section-heading">
            <h2>Create facility</h2>
          </div>
          <form action={createAdminFacilityAction} className="detail-stack">
            <input name="name" placeholder="Facility name" required />
            <input name="timezone" defaultValue="America/New_York" required />
            <input name="reason" placeholder="Audit reason" required />
            <button className="command-button" type="submit">
              <PlusCircle size={16} aria-hidden="true" />
              Create facility
            </button>
          </form>
        </aside>
      </section>
    </section>
  );
}
