import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Send, Settings2 } from "lucide-react";

import { createOrganizationAction, inviteWorkforceMemberAction } from "../../account-actions";
import { apiGetWithAccessToken, type Invitation } from "@/lib/api";
import { loadOnboardingContext } from "@/lib/onboarding-guards";

type OrganizationOnboardingPageProps = {
  searchParams: Promise<{
    invited?: string;
  }>;
};

export default async function OrganizationOnboardingPage({
  searchParams
}: OrganizationOnboardingPageProps) {
  const { invited } = await searchParams;
  const { claims, session, route, accessToken } = await loadOnboardingContext();
  const pendingInvites = !session
    ? await apiGetWithAccessToken<Invitation[]>("/invitations/pending", accessToken).catch(() => [])
    : [];

  if (!session) {
    if (route !== "/onboarding/organization") {
      redirect(route);
    }
  } else if ((session.facilityCount ?? 0) === 0) {
    redirect("/onboarding/structure");
  } else if (session.needsProfileOnboarding) {
    redirect("/onboarding/profile");
  }

  const canInvite = Boolean(session && (session.facilityCount ?? 0) > 0);

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Organization Setup</p>
          <h1>{canInvite ? "Invite your team." : "Create or join a workspace."}</h1>
          <p>
            {canInvite
              ? "Your workspace is ready. Invite workforce members by email to complete onboarding."
              : "New Supabase accounts can create the first workspace here. Existing organizations should invite members by email."}
          </p>
          <p className="form-note">Signed in as {claims.email ?? claims.sub}</p>
          {invited ? <div className="risk-strip">Invite created for the current organization.</div> : null}
        </div>

        {!session && pendingInvites.length > 0 ? (
          <div className="detail-stack">
            {pendingInvites.map((invitation) => (
              <article className="list-row" key={invitation.id}>
                <div>
                  <strong>Pending invite found</strong>
                  <span>
                    You were invited as {invitation.role.replaceAll("_", " ").toLowerCase()}. Open the invite
                    link from your email to join this workspace.
                  </span>
                </div>
              </article>
            ))}
            <Link className="command-button" href="/login">
              Back to sign in
            </Link>
          </div>
        ) : null}

        {!session && pendingInvites.length === 0 ? (
          <form action={createOrganizationAction} className="auth-form">
            <label htmlFor="name">Organization name</label>
            <input id="name" name="name" type="text" placeholder="Mercy Workforce Group" required />
            <label htmlFor="displayName">Your display name</label>
            <input id="displayName" name="displayName" type="text" placeholder="Alex Morgan" required />
            <label htmlFor="timezone">Timezone</label>
            <input id="timezone" name="timezone" type="text" placeholder="America/New_York" required />
            <button className="command-button" type="submit">
              <Building2 size={18} aria-hidden="true" />
              Create workspace
            </button>
          </form>
        ) : null}

        {canInvite ? (
          <form action={inviteWorkforceMemberAction} className="auth-form">
            <label htmlFor="email">Invite email</label>
            <input id="email" name="email" type="email" placeholder="new.rn@example.com" required />
            <label htmlFor="role">Role</label>
            <select id="role" name="role" defaultValue="EMPLOYEE">
              <option value="EMPLOYEE">Employee</option>
              <option value="UNIT_MANAGER">Unit manager</option>
              <option value="PAYROLL_ADMIN">Payroll</option>
              <option value="WORKFORCE_ADMIN">Workforce admin</option>
            </select>
            <button className="command-button" type="submit">
              <Send size={18} aria-hidden="true" />
              Send invite
            </button>
            <Link className="command-button" href="/app/admin">
              <Settings2 size={18} aria-hidden="true" />
              Open admin workspace
            </Link>
          </form>
        ) : null}
      </section>
    </main>
  );
}
