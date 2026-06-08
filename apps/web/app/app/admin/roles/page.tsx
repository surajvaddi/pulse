import { ShieldCheck } from "lucide-react";

import { assignAdminRoleAction } from "@/app/app/actions";
import { apiGet, type AdminUnit, type AdminUser } from "@/lib/api";

export default async function AdminRolesPage() {
  const [users, units] = await Promise.all([
    apiGet<AdminUser[]>("/admin/users", "user_admin"),
    apiGet<AdminUnit[]>("/admin/units", "user_admin")
  ]);

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Administration</p>
        <h1>Roles and scopes</h1>
      </div>
      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <h2>Current roles</h2>
            <span>{users.length} accounts</span>
          </div>
          <div className="item-list">
            {users.length === 0 ? <p className="empty-state">No users are in this workspace yet.</p> : null}
            {users.map((user) => (
              <article className="list-row" key={user.id}>
                <div>
                  <strong>{user.displayName}</strong>
                  <span>{user.roles.join(", ")}</span>
                </div>
                <span className="status-pill">{user.status}</span>
              </article>
            ))}
          </div>
        </div>
        <aside className="panel">
          <div className="section-heading">
            <h2>Assign role</h2>
          </div>
          {users.length === 0 ? (
            <p className="empty-state">Invite or create users before assigning roles.</p>
          ) : (
            <form action={assignAdminRoleAction} className="detail-stack">
              <select name="userId">
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.displayName}</option>
                ))}
              </select>
              <select name="role" defaultValue="EMPLOYEE">
                <option value="EMPLOYEE">Employee</option>
                <option value="UNIT_MANAGER">Unit Manager</option>
                <option value="PAYROLL_ADMIN">Payroll Admin</option>
                <option value="SYSTEM_ADMIN">System Admin</option>
              </select>
              <select name="unitId">
                <option value="">Self scoped or org-scoped role</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
              <input name="reason" placeholder="Audit reason" required />
              <button className="command-button" type="submit">
                <ShieldCheck size={16} aria-hidden="true" />
                Assign role
              </button>
            </form>
          )}
        </aside>
      </section>
    </section>
  );
}
