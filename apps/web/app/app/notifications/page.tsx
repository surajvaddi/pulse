import { apiGet, type Notification } from "@/lib/api";
import { markNotificationReadAction } from "../actions";

export default async function NotificationsPage() {
  const notifications = await apiGet<Notification[]>("/notifications", "user_jordan_manager");

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Notifications</p>
        <h1>Inbox</h1>
      </div>
      <section className="panel">
        <div className="item-list">
          {notifications.map((notification) => (
            <article className="list-row" key={notification.id}>
              <div>
                <strong>{notification.type.replaceAll("_", " ")}</strong>
                <span>{JSON.stringify(notification.payload)}</span>
              </div>
              <form action={markNotificationReadAction}>
                <input type="hidden" name="notificationId" value={notification.id} />
                <input type="hidden" name="userId" value="user_jordan_manager" />
                <button className="command-button" type="submit">
                  {notification.status === "READ" ? "Read" : "Mark read"}
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
