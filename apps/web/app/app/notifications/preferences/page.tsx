import Link from "next/link";

import {
  apiGet,
  type NotificationPreference,
  type SessionSummary
} from "@/lib/api";
import { updateNotificationPreferenceAction } from "../../actions";

function label(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export default async function NotificationPreferencesPage() {
  const [session, preferences] = await Promise.all([
    apiGet<SessionSummary>("/auth/me"),
    apiGet<NotificationPreference[]>("/notifications/preferences")
  ]);
  const isAiService = session.role === "AI_AGENT_SERVICE";

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Notifications</p>
        <h1>Preferences</h1>
        <p>Choose delivery settings for workflow alerts scoped to {session.displayName}.</p>
      </div>

      <div className="action-row">
        <Link className="secondary-button" href="/app/notifications">
          Back to inbox
        </Link>
      </div>

      <section className="panel">
        <div className="item-list">
          {preferences.length ? (
            preferences.map((preference) => {
              const canEdit = !preference.required && !isAiService;
              return (
                <article className="list-row preference-row" key={preference.id}>
                  <div className="notification-copy">
                    <div>
                      <strong>{label(preference.category)}</strong>
                      <span>
                        {label(preference.channel)} · {label(preference.priority)}
                      </span>
                    </div>
                    <p>
                      {preference.required
                        ? "Required alert. This cannot be disabled."
                        : preference.enabled
                          ? "Delivery is enabled."
                          : "Delivery is paused."}
                    </p>
                  </div>

                  <div className="notification-actions">
                    <span className={preference.enabled ? "status-pill" : "muted-pill"}>
                      {preference.enabled ? "Enabled" : "Paused"}
                    </span>
                    {canEdit ? (
                      <form action={updateNotificationPreferenceAction}>
                        <input type="hidden" name="userId" value={session.userId} />
                        <input type="hidden" name="category" value={preference.category} />
                        <input type="hidden" name="channel" value={preference.channel} />
                        <input
                          type="hidden"
                          name="enabled"
                          value={preference.enabled ? "false" : "true"}
                        />
                        <button className="command-button" type="submit">
                          {preference.enabled ? "Pause" : "Enable"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <p className="empty-state">Notification defaults are being prepared.</p>
          )}
        </div>
      </section>
    </section>
  );
}
