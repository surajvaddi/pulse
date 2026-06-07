import { CalendarCheck2, Clock3, RefreshCw } from "lucide-react";

import { apiGet, type DemoShift, type SessionSummary } from "@/lib/api";
import { buildScheduleViewModel } from "@/lib/schedule-view-model";
import { WorkflowNote } from "../workflow-note";
import { ScheduleWorkspace } from "./schedule-workspace";

export default async function SchedulePage() {
  const [session, shifts] = await Promise.all([
    apiGet<SessionSummary>("/auth/me"),
    apiGet<DemoShift[]>("/demo/schedule/visible")
  ]);
  const schedule = buildScheduleViewModel(shifts);
  const scheduleTitle =
    session.role === "EMPLOYEE" || session.role === "EXTERNAL_AGENCY_ADMIN"
      ? "Your upcoming shifts"
      : "Scoped schedule board";

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Schedule</p>
        <h1>{scheduleTitle}</h1>
        <p>Scan visible shifts by day, review shift details, and use only actions allowed for this role.</p>
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

      <ScheduleWorkspace schedule={schedule} />
    </section>
  );
}
