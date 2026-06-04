import { apiGet, type Notification, type SessionSummary } from "@/lib/api";
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
      <section className="panel">
        <div className="item-list">
          {notifications.length ? (
            notifications.map((notification) => (
              <article className="list-row" key={notification.id}>
                <div>
                  <strong>{notification.type.replaceAll("_", " ")}</strong>
                  <span>{JSON.stringify(notification.payload)}</span>
                </div>
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="notificationId" value={notification.id} />
                  <input type="hidden" name="userId" value={session.userId} />
                  <button className="command-button" type="submit">
                    {notification.status === "READ" ? "Read" : "Mark read"}
                  </button>
                </form>
              </article>
            ))
          ) : (
            <p className="empty-state">No notifications are waiting for this account.</p>
          )}
        </div>
      </section>
    </section>
  );
}
