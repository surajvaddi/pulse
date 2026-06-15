import { ArrowRight, Bell } from "lucide-react";

import { completeNotificationPreferencesAction } from "../../account-actions";
import { requireOnboardingStep } from "@/lib/onboarding-guards";

export default async function NotificationPreferencesOnboardingPage() {
  const { session } = await requireOnboardingStep("/onboarding/preferences");
  const isAdministrator =
    session?.role === "ORGANIZATION_OWNER" || session?.role === "SYSTEM_ADMIN";

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Notification Setup</p>
          <h1>Choose how you want to be notified.</h1>
          <p>
            In-app alerts for schedule changes stay on by default. Adjust optional email and SMS
            delivery before entering the workspace.
          </p>
        </div>

        <form action={completeNotificationPreferencesAction} className="auth-form">
          <label htmlFor="phone">Mobile phone (optional)</label>
          <input id="phone" name="phone" type="tel" placeholder="+1 555 010 2000" />

          <label className="check-label" htmlFor="emailAlertsEnabled">
            <input id="emailAlertsEnabled" name="emailAlertsEnabled" type="checkbox" defaultChecked />
            Email me about workflow updates
          </label>

          {isAdministrator ? (
            <label className="check-label" htmlFor="smsAlertsEnabled">
              <input id="smsAlertsEnabled" name="smsAlertsEnabled" type="checkbox" />
              Text me for urgent system alerts when a phone number is provided
            </label>
          ) : null}

          <button className="command-button" type="submit">
            <Bell size={18} aria-hidden="true" />
            Save preferences
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      </section>
    </main>
  );
}
