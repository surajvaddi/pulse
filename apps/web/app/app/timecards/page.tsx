import { AlertTriangle, CheckCircle2, ReceiptText } from "lucide-react";

import {
  apiGet,
  type SessionSummary,
  type TimecardEvent,
  type TimecardException,
  type TimeclockStatus
} from "@/lib/api";
import { buildPayrollDashboard } from "@/lib/payroll-dashboard";
import { clockInAction, clockOutAction, resolveTimecardAction } from "../actions";
import { WorkflowNote } from "../workflow-note";

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function TimecardsPage() {
  const session = await apiGet<SessionSummary>("/auth/me");
  const exceptions = await apiGet<TimecardException[]>("/demo/timecards/exceptions");
  const isPayroll = session.role === "PAYROLL_ADMIN";

  if (isPayroll) {
    const dashboard = buildPayrollDashboard(exceptions);
    const icons = [AlertTriangle, CheckCircle2, ReceiptText];

    return (
      <section className="page-stack">
        <div className="page-hero">
          <p className="eyebrow">Payroll Dashboard</p>
          <h1>Timecard exception review</h1>
          <p>Review scoped exceptions, resolve approved corrections, and prepare clean exports.</p>
        </div>
        <WorkflowNote route="/app/timecards" role={session.role} />
        <div className="dashboard-grid">
          {dashboard.cards.map((card, index) => {
            const Icon = icons[index] ?? ReceiptText;
            return (
              <article className={`metric-card metric-card-${card.tone}`} key={card.title}>
                <Icon size={20} aria-hidden="true" />
                <p>{card.title}</p>
                <strong>{card.value}</strong>
                <span>{card.detail}</span>
              </article>
            );
          })}
        </div>
        <section className="panel">
          <div className="section-heading">
            <h2>Exception Queue</h2>
            <span>{dashboard.openExceptions.length} open</span>
          </div>
          <div className="item-list">
            {dashboard.openExceptions.length > 0 ? (
              dashboard.openExceptions.map((exception) => (
                <article className="list-row" key={exception.id}>
                  <div>
                    <strong>{exception.type.replaceAll("_", " ")}</strong>
                    <span>{exception.explanation}</span>
                  </div>
                  <form action={resolveTimecardAction}>
                    <input type="hidden" name="exceptionId" value={exception.id} />
                    <button className="command-button" type="submit">
                      Resolve
                    </button>
                  </form>
                </article>
              ))
            ) : (
              <p className="empty-state">No payroll exceptions are waiting.</p>
            )}
          </div>
        </section>
      </section>
    );
  }

  const [clockStatus, events] = await Promise.all([
    apiGet<TimeclockStatus>("/timeclock/status"),
    apiGet<TimecardEvent[]>("/timeclock/events")
  ]);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Timecard</p>
        <h1>Current pay period</h1>
        <p>Clock in and out for assigned shifts, then monitor any exceptions that need review.</p>
      </div>
      <WorkflowNote route="/app/timecards" role={session.role} />
      <section className="panel">
        <div className="section-heading">
          <h2>Time clock</h2>
          <span>{clockStatus.status.replace("_", " ")}</span>
        </div>
        <div className="detail-stack">
          <strong>{clockStatus.currentShiftTitle ?? "No assigned shift selected"}</strong>
          <span>
            Last event:{" "}
            {clockStatus.lastEvent
              ? `${clockStatus.lastEvent.eventType.replace("_", " ")} at ${formatEventTime(clockStatus.lastEvent.occurredAt)}`
              : "No events recorded"}
          </span>
          <div className="action-row">
            {clockStatus.status === "CLOCKED_OUT" ? (
              <form action={clockInAction}>
                <input type="hidden" name="shiftId" value={clockStatus.currentShiftId ?? ""} />
                <button className="command-button" type="submit">
                  Clock in
                </button>
              </form>
            ) : (
              <form action={clockOutAction}>
                <button className="command-button" type="submit">
                  Clock out
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Clock events</h2>
          <span>{events.length} recorded</span>
        </div>
        <div className="item-list">
          {events.map((event) => (
            <article className="list-row" key={event.id}>
              <div>
                <strong>{event.eventType.replace("_", " ")}</strong>
                <span>{formatEventTime(event.occurredAt)}</span>
              </div>
              <span className="status-pill">{event.status}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Exceptions</h2>
          <span>{exceptions.length} open</span>
        </div>
        <div className="item-list">
          {exceptions.map((exception) => (
            <article className="list-row" key={exception.id}>
              <div>
                <strong>{exception.type.replaceAll("_", " ")}</strong>
                <span>{exception.explanation}</span>
              </div>
              <span className="status-pill">{exception.status}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
