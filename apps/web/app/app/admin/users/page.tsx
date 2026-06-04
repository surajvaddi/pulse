import { UserX } from "lucide-react";

import { suspendAdminUserAction } from "@/app/app/actions";
import { apiGet, type AdminUser } from "@/lib/api";

export default async function AdminUsersPage() {
  const users = await apiGet<AdminUser[]>("/admin/users", "user_admin");

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Administration</p>
        <h1>Users</h1>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>Accounts</h2>
          <span>{users.length} users</span>
        </div>
        <div className="item-list">
          {users.map((user) => (
            <article className="list-row" key={user.id}>
              <div>
                <strong>{user.displayName}</strong>
                <span>{user.email}</span>
                <span>{user.roles.join(", ")}</span>
              </div>
              <form action={suspendAdminUserAction} className="action-row">
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="reason" value="Suspended from user administration" />
                <span className="status-pill">{user.status}</span>
                <button className="icon-button" type="submit" aria-label={`Suspend ${user.displayName}`}>
                  <UserX size={16} />
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
