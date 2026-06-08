import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Send, Settings2 } from "lucide-react";

import { createOrganizationAction, inviteWorkforceMemberAction } from "../../account-actions";
import { readSupabaseAccessToken } from "@/lib/onboarding-access";
import { decodeSupabaseAccessTokenClaims } from "@/lib/supabase-session";

type OrganizationOnboardingPageProps = {
  searchParams: Promise<{
    invited?: string;
  }>;
};

export default async function OrganizationOnboardingPage({
  searchParams
}: OrganizationOnboardingPageProps) {
  const { invited } = await searchParams;
  const accessToken = await readSupabaseAccessToken();
  if (!accessToken) {
    redirect("/login");
  }
  const claims = decodeSupabaseAccessTokenClaims(accessToken);
  if (!claims) {
    redirect("/login");
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Organization Setup</p>
          <h1>Create or join a workspace.</h1>
          <p>
            New Supabase accounts can create the first workspace here. Existing organizations should invite members by email.
          </p>
          <p className="form-note">Signed in as {claims.email ?? claims.sub}</p>
          {invited ? <div className="risk-strip">Invite created for the current organization.</div> : null}
        </div>

        <form action={createOrganizationAction} className="auth-form">
          <label htmlFor="name">Organization name</label>
          <input id="name" name="name" type="text" placeholder="Mercy Workforce Group" />
          <label htmlFor="displayName">Your display name</label>
          <input id="displayName" name="displayName" type="text" placeholder="Alex Morgan" />
          <label htmlFor="timezone">Timezone</label>
          <input id="timezone" name="timezone" type="text" defaultValue="America/New_York" />
          <button className="command-button" type="submit">
            <Building2 size={18} aria-hidden="true" />
            Create workspace
          </button>
        </form>

        <form action={inviteWorkforceMemberAction} className="auth-form">
          <label htmlFor="email">Invite email</label>
          <input id="email" name="email" type="email" placeholder="new.rn@example.com" />
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
          <Link className="command-button" href="/app/admin/audit">
            <Settings2 size={18} aria-hidden="true" />
            Review audit trail
          </Link>
        </form>
      </section>
    </main>
  );
}
