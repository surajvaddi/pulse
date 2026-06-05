import { apiGet, type Notification } from "@/lib/api";
import {
  notificationMetadata,
  notificationSummary,
  notificationTitle
} from "@/lib/notification-view";
import { WorkflowNote } from "../../workflow-note";

export default async function AdminNotificationDeliveryPage() {
  const failures = await apiGet<Notification[]>("/notifications/delivery-failures", "user_admin");

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">System Administration</p>
        <h1>Notification delivery</h1>
        <p>Review failed workflow alert deliveries and retry context.</p>
      </div>
      <WorkflowNote route="/app/admin/notifications" role="SYSTEM_ADMIN" />

      <section className="panel">
        <div className="section-heading">
          <h2>Delivery Failures</h2>
          <span>{failures.length} failed</span>
        </div>
        <div className="item-list">
          {failures.length ? (
            failures.map((notification) => (
              <article className="list-row notification-row" key={notification.id}>
                <div className="notification-copy">
                  <div>
                    <strong>{notificationTitle(notification)}</strong>
                    <span>{notificationMetadata(notification)}</span>
                  </div>
                  <p>{notification.failureReason ?? notificationSummary(notification)}</p>
                  <span>
                    Recipient: {notification.recipientUserId} · Retries: {notification.retryCount}
                  </span>
                  {notification.nextRetryAt ? (
                    <time dateTime={notification.nextRetryAt}>
                      Next retry:{" "}
                      {new Intl.DateTimeFormat("en", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      }).format(new Date(notification.nextRetryAt))}
                    </time>
                  ) : null}
                </div>
                <span className="status-pill">{notification.channel.replaceAll("_", " ")}</span>
              </article>
            ))
          ) : (
            <p className="empty-state">No delivery failures are waiting.</p>
          )}
        </div>
      </section>
    </section>
  );
}
