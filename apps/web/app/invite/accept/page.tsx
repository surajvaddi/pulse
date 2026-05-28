import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { apiPublicGet, type Invitation } from "@/lib/api";
import { AcceptInviteForm } from "./accept-invite-form";

type AcceptInvitePageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { token } = await searchParams;
  const invitation = token
    ? await apiPublicGet<Invitation>(`/invitations/${encodeURIComponent(token)}`).catch(
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
          <AcceptInviteForm token={token} />
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
