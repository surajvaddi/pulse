import Link from "next/link";

import { apiGet, type Notification, type SessionSummary } from "@/lib/api";
import {
  notificationActionFor,
  notificationMetadata,
  notificationSummary,
  notificationTitle
} from "@/lib/notification-view";
import { markNotificationReadAction } from "../actions";

export default async function NotificationsPage() {
  const [session, notifications] = await Promise.all([
    apiGet<SessionSummary>("/auth/me"),
    apiGet<Notification[]>("/notifications")
  ]);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Notifications</p>
        <h1>Inbox</h1>
        <p>Review messages and workflow alerts scoped to {session.displayName}.</p>
      </div>
      <div className="action-row">
        <Link className="secondary-button" href="/app/notifications/preferences">
          Preferences
        </Link>
      </div>
      <section className="panel">
        <div className="item-list">
          {notifications.length ? (
            notifications.map((notification) => {
              const action = notificationActionFor(notification, session);
              return (
                <article
                  className={`list-row notification-row ${notification.status === "READ" ? "is-read" : ""}`}
                  key={notification.id}
                >
                  <div className="notification-copy">
                    <div>
                      <strong>{notificationTitle(notification)}</strong>
                      <span>{notificationMetadata(notification)}</span>
                    </div>
                    <p>{notificationSummary(notification)}</p>
                    {notification.createdAt ? (
                      <time dateTime={notification.createdAt}>
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit"
                        }).format(new Date(notification.createdAt))}
                      </time>
                    ) : null}
                  </div>
                  <div className="notification-actions">
                    {action ? (
                      <Link className="secondary-button" href={action.href}>
                        {action.label}
                      </Link>
                    ) : null}
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <input type="hidden" name="userId" value={session.userId} />
                      <button className="command-button" type="submit">
                        {notification.status === "READ" ? "Read" : "Mark read"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="empty-state">No notifications are waiting for this account.</p>
          )}
        </div>
      </section>
    </section>
  );
}
