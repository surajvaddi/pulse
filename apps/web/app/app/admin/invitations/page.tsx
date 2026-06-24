import { apiGetSession, type AdminInvitation, type InvitationOptions } from "@/lib/api";
import { ScopedInvitationForm } from "@/app/onboarding/organization/scoped-invitation-form";

export default async function AdminInvitationsPage() {
  const [invitations, options] = await Promise.all([
    apiGetSession<AdminInvitation[]>("/admin/invitations", "user_admin"),
    apiGetSession<InvitationOptions>("/onboarding/invitation-options", "user_admin")
  ]);

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
          <ScopedInvitationForm options={options} mode="admin" />
        </aside>
      </section>
    </section>
  );
}
