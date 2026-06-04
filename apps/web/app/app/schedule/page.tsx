import { CalendarCheck2, CalendarPlus, Clock3, MessageSquare, RefreshCw, Send } from "lucide-react";

import { apiGet, type DemoShift, type SessionSummary } from "@/lib/api";
import { buildScheduleViewModel } from "@/lib/schedule-view-model";
import { createSwapAction } from "../actions";
import { WorkflowNote } from "../workflow-note";

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
  const [session, shifts] = await Promise.all([
    apiGet<SessionSummary>("/auth/me"),
    apiGet<DemoShift[]>("/demo/schedule/me")
  ]);
  const schedule = buildScheduleViewModel(shifts);
  const selectedShift = schedule.selectedShift;

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Employee Schedule</p>
        <h1>Your upcoming shifts</h1>
        <p>Scan assigned shifts by day, review shift details, and start swap or calendar actions.</p>
      </div>
      <WorkflowNote route="/app/schedule" role={session.role} />

      <div className="dashboard-grid">
        <article className="metric-card metric-card-ready">
          <CalendarCheck2 size={20} aria-hidden="true" />
          <p>Assigned</p>
          <strong>{schedule.summary.assignedCount}</strong>
          <span>Published shifts in view</span>
        </article>
        <article className="metric-card">
          <Clock3 size={20} aria-hidden="true" />
          <p>Total hours</p>
          <strong>{schedule.summary.totalHours}</strong>
          <span>Across visible shifts</span>
        </article>
        <article className="metric-card metric-card-attention">
          <RefreshCw size={20} aria-hidden="true" />
          <p>Pending</p>
          <strong>{schedule.summary.pendingCount}</strong>
          <span>Swap or review state</span>
        </article>
      </div>

      <div className="schedule-layout">
        <section className="panel schedule-board">
          <div className="section-heading">
            <h2>Schedule</h2>
            <span>
              {schedule.groups.length} days · {schedule.summary.openCount} open
            </span>
          </div>
          <div className="schedule-legend" aria-label="Schedule status legend">
            <span className="status-pill status-assigned">Assigned</span>
            <span className="status-pill status-open">Open</span>
            <span className="status-pill status-pending">Pending</span>
          </div>
          <div className="schedule-days">
            {schedule.groups.map((group) => (
              <article className="schedule-day" key={group.dateKey}>
                <h3>{group.label}</h3>
                {group.shifts.map((shift) => (
                  <div className={`schedule-shift schedule-shift-${shift.statusTone}`} key={shift.id}>
                    <div>
                      <strong>{shift.title}</strong>
                      <span>
                        {shift.startsLabel} to {shift.endsLabel}
                      </span>
                    </div>
                    <span className={`status-pill status-${shift.statusTone}`}>{shift.status}</span>
                  </div>
                ))}
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
                <form action={createSwapAction}>
                  <input type="hidden" name="originalShiftId" value={selectedShift.id} />
                  <button className="command-button" type="submit">
                    <RefreshCw size={16} /> Request Swap
                  </button>
                </form>
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
