const notifications = [
  "Staffing risk queued for ICU night coverage",
  "Timecard exception opened for late clock-in",
  "Approval routing will activate in Phase 4"
];

export default function NotificationsPage() {
  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Notifications</p>
        <h1>Inbox</h1>
      </div>
      <section className="panel">
        <div className="item-list">
          {notifications.map((notification) => (
            <article className="list-row" key={notification}>
              <div>
                <strong>{notification}</strong>
                <span>In-app channel</span>
              </div>
              <button className="command-button">Mark read</button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

