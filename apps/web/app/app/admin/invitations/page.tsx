import { Send } from "lucide-react";

import { createAdminInvitationAction } from "@/app/app/actions";
import { apiGet, type AdminInvitation } from "@/lib/api";

export default async function AdminInvitationsPage() {
  const invitations = await apiGet<AdminInvitation[]>("/admin/invitations", "user_admin");

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Administration</p>
        <h1>Invitations</h1>
      </div>
      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <h2>Invite queue</h2>
            <span>{invitations.length} invites</span>
          </div>
          <div className="item-list">
            {invitations.length ? invitations.map((invitation) => (
              <article className="list-row" key={invitation.id}>
                <div>
                  <strong>{invitation.email}</strong>
                  <span>{invitation.role}</span>
                </div>
                <span className="status-pill">{invitation.status}</span>
              </article>
            )) : <p className="empty-state">No pending invitations.</p>}
          </div>
        </div>
        <aside className="panel">
          <div className="section-heading">
            <h2>Send invite</h2>
          </div>
          <form action={createAdminInvitationAction} className="detail-stack">
            <input name="email" type="email" placeholder="member@example.com" required />
            <select name="role" defaultValue="EMPLOYEE">
              <option value="EMPLOYEE">Employee</option>
              <option value="UNIT_MANAGER">Unit Manager</option>
              <option value="PAYROLL_ADMIN">Payroll Admin</option>
              <option value="SYSTEM_ADMIN">System Admin</option>
            </select>
            <input name="reason" placeholder="Audit reason" required />
            <button className="command-button" type="submit">
              <Send size={16} aria-hidden="true" />
              Send invite
            </button>
          </form>
        </aside>
      </section>
    </section>
  );
}
