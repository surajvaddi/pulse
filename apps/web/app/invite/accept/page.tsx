import Link from "next/link";
import { CheckCircle2, UserPlus } from "lucide-react";

import { acceptInvitationAction } from "../../account-actions";
import { apiGet, demoUsers, type Invitation } from "@/lib/api";

type AcceptInvitePageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { token } = await searchParams;
  const invitation = token
    ? await apiGet<Invitation>(`/invitations/${encodeURIComponent(token)}`, "user_priya").catch(
        () => null
      )
    : null;

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Invite Acceptance</p>
          <h1>{invitation ? "Confirm your invitation." : "Invitation unavailable."}</h1>
          <p>
            {invitation
              ? `${invitation.email} has been invited as ${invitation.role}.`
              : "The invite token is missing, expired, or already accepted."}
          </p>
        </div>

        {invitation && token ? (
          <form action={acceptInvitationAction} className="auth-form">
            <input type="hidden" name="token" value={token} />
            <label htmlFor="userId">Accept as</label>
            <select id="userId" name="userId" defaultValue="user_priya">
              {demoUsers.slice(0, 2).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label}
                </option>
              ))}
            </select>
            <button className="command-button" type="submit">
              <UserPlus size={18} aria-hidden="true" />
              Accept invite
            </button>
          </form>
        ) : (
          <Link className="command-button" href="/login">
            <CheckCircle2 size={18} aria-hidden="true" />
            Back to login
          </Link>
        )}
      </section>
    </main>
  );
}
