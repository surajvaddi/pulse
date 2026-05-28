import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";

export default function ProfileOnboardingPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Profile Setup</p>
          <h1>Confirm workforce details.</h1>
          <p>
            The production flow will collect contact details, role, base unit, credentials, and
            payroll identifiers before the member enters scheduling workflows.
          </p>
        </div>
        <div className="detail-stack">
          <article className="list-row">
            <div>
              <strong>Identity</strong>
              <span>Name, email, phone, and Supabase account ID</span>
            </div>
            <BadgeCheck size={18} aria-hidden="true" />
          </article>
          <article className="list-row">
            <div>
              <strong>Workforce profile</strong>
              <span>Role, home facility, unit scope, credentials, and employment status</span>
            </div>
            <BadgeCheck size={18} aria-hidden="true" />
          </article>
          <Link className="command-button" href="/app/home">
            <ArrowRight size={18} aria-hidden="true" />
            Enter workspace
          </Link>
        </div>
      </section>
    </main>
  );
}
