import { MessageSquare, RefreshCw, Send, CalendarPlus } from "lucide-react";

import { apiGet, type DemoShift } from "@/lib/api";

function formatShiftTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function SchedulePage() {
  const shifts = await apiGet<DemoShift[]>("/demo/schedule/me");
  const selectedShift = shifts[0];

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Employee Schedule</p>
        <h1>Your upcoming shifts</h1>
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="section-heading">
            <h2>List View</h2>
            <span>{shifts.length} visible</span>
          </div>
          <div className="item-list">
            {shifts.map((shift) => (
              <article className="list-row" key={shift.id}>
                <div>
                  <strong>{shift.title}</strong>
                  <span>{formatShiftTime(shift.startsAt)}</span>
                </div>
                <span className="status-pill">{shift.status}</span>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel">
          <div className="section-heading">
            <h2>Shift Detail</h2>
            <span>Scoped self view</span>
          </div>
          {selectedShift ? (
            <div className="detail-stack">
              <strong className="detail-title">{selectedShift.title}</strong>
              <span>{formatShiftTime(selectedShift.startsAt)}</span>
              <span>{formatShiftTime(selectedShift.endsAt)}</span>
              <span>Unit: ICU</span>
              <span>Required: ACLS, ICU Qualified</span>
              <div className="action-row">
                <button className="command-button">
                  <RefreshCw size={16} /> Request Swap
                </button>
                <button className="command-button">
                  <MessageSquare size={16} /> Message Manager
                </button>
                <button className="command-button">
                  <CalendarPlus size={16} /> Add Calendar
                </button>
                <button className="command-button">
                  <Send size={16} /> Ask Copilot
                </button>
              </div>
            </div>
          ) : (
            <p className="empty-state">No assigned shifts are visible for this demo user.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

