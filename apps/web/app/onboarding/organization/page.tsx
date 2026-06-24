import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Settings2 } from "lucide-react";

import {
  acceptPendingInvitationAction,
  createOrganizationAction,
  createWorkforceRoleAction
} from "../../account-actions";
import { apiGetWithAccessToken, type Invitation, type InvitationOptions } from "@/lib/api";
import { loadOnboardingContext } from "@/lib/onboarding-guards";
import { ScopedInvitationForm } from "./scoped-invitation-form";

type OrganizationOnboardingPageProps = {
  searchParams: Promise<{
    invited?: string;
    roleCreated?: string;
  }>;
};

export default async function OrganizationOnboardingPage({
  searchParams
}: OrganizationOnboardingPageProps) {
  const { invited, roleCreated } = await searchParams;
  const { claims, session, route, accessToken } = await loadOnboardingContext();
  const pendingInvites = !session
    ? await apiGetWithAccessToken<Invitation[]>("/invitations/pending", accessToken).catch(() => [])
    : [];
  const invitationOptions = session
    ? await apiGetWithAccessToken<InvitationOptions>(
        "/onboarding/invitation-options",
        accessToken
      )
    : null;

  if (!session) {
    if (route !== "/onboarding/organization") {
      redirect(route);
    }
  } else if ((session.facilityCount ?? 0) === 0) {
    redirect("/onboarding/structure");
  } else if (session.needsProfileOnboarding) {
    redirect("/onboarding/profile");
  } else if (session.needsNotificationPreferencesOnboarding) {
    redirect("/onboarding/preferences");
  } else if (session.needsIntegrationsOnboarding) {
    redirect("/onboarding/integrations");
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
          {roleCreated ? <div className="risk-strip">Workforce role created.</div> : null}
        </div>

        {!session && pendingInvites.length > 0 ? (
          <div className="detail-stack">
            {pendingInvites.map((invitation) => (
              <article className="list-row" key={invitation.id}>
                <div>
                  <strong>Pending invite found</strong>
                  <span>
                    You were invited as {invitation.role.replaceAll("_", " ").toLowerCase()}.
                  </span>
                </div>
                {invitation.acceptanceHandle ? (
                  <form action={acceptPendingInvitationAction}>
                    <input type="hidden" name="invitationId" value={invitation.id} />
                    <input
                      type="hidden"
                      name="acceptanceHandle"
                      value={invitation.acceptanceHandle}
                    />
                    <button className="command-button" type="submit">
                      Join workspace
                    </button>
                  </form>
                ) : null}
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
          <div className="detail-stack">
            {invitationOptions?.workforceRoles.length === 0 ? (
              <form action={createWorkforceRoleAction} className="auth-form">
                <label htmlFor="workforceRoleName">First workforce role</label>
                <input id="workforceRoleName" name="name" placeholder="Registered Nurse" required />
                <label htmlFor="workforceRoleDescription">Description</label>
                <input id="workforceRoleDescription" name="description" placeholder="Direct care nursing role" />
                <button className="command-button" type="submit">Create workforce role</button>
              </form>
            ) : null}
            {invitationOptions ? <ScopedInvitationForm options={invitationOptions} /> : null}
            <Link className="command-button" href="/app/admin">
              <Settings2 size={18} aria-hidden="true" />
              Open admin workspace
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
