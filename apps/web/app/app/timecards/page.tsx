import { apiGet, type TimecardEvent, type TimecardException, type TimeclockStatus } from "@/lib/api";
import { clockInAction, clockOutAction, resolveTimecardAction } from "../actions";

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function TimecardsPage() {
  const [exceptions, clockStatus, events] = await Promise.all([
    apiGet<TimecardException[]>("/demo/timecards/exceptions"),
    apiGet<TimeclockStatus>("/timeclock/status"),
    apiGet<TimecardEvent[]>("/timeclock/events")
  ]);

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Timecard</p>
        <h1>Current pay period</h1>
      </div>
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
              <form action={resolveTimecardAction}>
                <input type="hidden" name="exceptionId" value={exception.id} />
                <button className="command-button" type="submit">
                  {exception.status === "RESOLVED" ? "Resolved" : "Resolve"}
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
