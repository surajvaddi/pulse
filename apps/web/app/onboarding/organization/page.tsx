import Link from "next/link";
import { Send, Settings2 } from "lucide-react";

import { inviteWorkforceMemberAction } from "../../account-actions";

type OrganizationOnboardingPageProps = {
  searchParams: Promise<{
    invited?: string;
  }>;
};

export default async function OrganizationOnboardingPage({
  searchParams
}: OrganizationOnboardingPageProps) {
  const { invited } = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Organization Setup</p>
          <h1>Prepare the first production workspace.</h1>
          <p>
            Admin onboarding starts with account ownership, facility structure, unit scopes, and
            workforce invitations.
          </p>
          {invited ? <div className="risk-strip">Invite created for the demo organization.</div> : null}
        </div>

        <form action={inviteWorkforceMemberAction} className="auth-form">
          <label htmlFor="email">Invite email</label>
          <input id="email" name="email" type="email" defaultValue="new.rn@example.com" />
          <label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue="EMPLOYEE">
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="PAYROLL">Payroll</option>
            <option value="ORG_ADMIN">Organization admin</option>
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
