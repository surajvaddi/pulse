import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";

import { upsertProfileAction } from "../../account-actions";
import { requireOnboardingStep } from "@/lib/onboarding-guards";

export default async function ProfileOnboardingPage() {
  const { session } = await requireOnboardingStep("/onboarding/profile");
  const assignment = session?.workforceOnboardingAssignment;

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Profile Setup</p>
          <h1>Confirm workforce details.</h1>
          <p>
            Link your Supabase account to a workforce profile so schedules, timecards, swaps, and notifications can use real organization data.
          </p>
        </div>

        {!assignment ? (
          <div className="detail-stack">
            <article className="list-row">
              <div>
                <strong>Workforce assignment required</strong>
                <span>Ask an organization administrator to send a new invitation with your facility, unit, and role.</span>
              </div>
              <BadgeCheck size={18} aria-hidden="true" />
            </article>
            <Link className="command-button" href="/onboarding/organization">
              <ArrowRight size={18} aria-hidden="true" />
              Review workspace invitation
            </Link>
          </div>
        ) : (
          <form action={upsertProfileAction} className="auth-form">
            <label htmlFor="legalName">Legal name</label>
            <input id="legalName" name="legalName" type="text" defaultValue={session?.displayName ?? ""} required />
            <label htmlFor="preferredName">Preferred name</label>
            <input id="preferredName" name="preferredName" type="text" defaultValue={session?.displayName ?? ""} />
            <div className="detail-stack" aria-label="Organization-assigned workforce details">
              <article className="list-row">
                <div>
                  <strong>{assignment.workforceRole.name}</strong>
                  <span>{assignment.employmentType.replaceAll("_", " ").toLowerCase()}</span>
                </div>
                <BadgeCheck size={18} aria-hidden="true" />
              </article>
              <article className="list-row">
                <div>
                  <strong>{assignment.unit.name}</strong>
                  <span>{assignment.facility.name}</span>
                </div>
                <BadgeCheck size={18} aria-hidden="true" />
              </article>
              <article className="list-row">
                <div>
                  <strong>{assignment.employeeNumber ?? "Assigned automatically"}</strong>
                  <span>Employee number</span>
                </div>
                <BadgeCheck size={18} aria-hidden="true" />
              </article>
            </div>
            <button className="command-button" type="submit">
              <ArrowRight size={18} aria-hidden="true" />
              Save profile
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
