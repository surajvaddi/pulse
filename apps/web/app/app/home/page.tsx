import Link from "next/link";
import { Bot, CalendarDays, Clock3, RefreshCw, ShieldCheck } from "lucide-react";

import {
  apiGet,
  type DemoShift,
  type SessionSummary,
  type TimecardException,
  type TimeclockStatus
} from "@/lib/api";
import { buildEmployeeDashboard, formatDashboardDate } from "@/lib/employee-dashboard";
import { buildRoleDashboard } from "@/lib/role-dashboard";
import { clockInAction, clockOutAction, createSwapAction } from "../actions";
import { WorkflowNote } from "../workflow-note";

function workspaceLabel(prefix: string, id: string | undefined) {
  if (!id) {
    return `${prefix} not set`;
  }
  return `${prefix} ${id.replace(/^(unit|facility)_/, "").replaceAll("_", " ").toUpperCase()}`;
}

export default async function HomePage() {
  const session = await apiGet<SessionSummary>("/auth/me");
  if (!["EMPLOYEE", "EXTERNAL_AGENCY_ADMIN"].includes(session.role)) {
    const roleDashboard = buildRoleDashboard(session.role);
    return (
      <section className="page-stack">
        <div className="page-hero">
          <p className="eyebrow">{roleDashboard.eyebrow}</p>
          <h1>{roleDashboard.title}</h1>
          <p>{roleDashboard.summary}</p>
        </div>
        <WorkflowNote route="/app/home" role={session.role} />
        <div className="dashboard-grid">
          {roleDashboard.cards.map((card) => (
            <article className="metric-card" key={card.title}>
              <CalendarDays size={20} aria-hidden="true" />
              <p>{card.title}</p>
              <strong>{card.value}</strong>
              <span>{card.detail}</span>
              <Link className="command-button" href={card.href}>
                Open
              </Link>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const [shifts, exceptions, clockStatus] = await Promise.all([
    apiGet<DemoShift[]>("/demo/schedule/me"),
    apiGet<TimecardException[]>("/demo/timecards/exceptions"),
    apiGet<TimeclockStatus>("/timeclock/status")
  ]);
  const dashboard = buildEmployeeDashboard({ session, shifts, exceptions, clockStatus });
  const icons = [Clock3, ShieldCheck];

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Employee Home</p>
        <h1>{dashboard.heading}</h1>
        <p>{dashboard.summary}</p>
      </div>
      <WorkflowNote route="/app/home" role={session.role} />
      <div className="dashboard-grid">
        {dashboard.cards.slice(1).map((card, index) => {
          const Icon = icons[index] ?? CalendarDays;
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
      <div className="two-column">
        <section className="panel next-shift-panel" aria-labelledby="next-shift-title">
          <div className="next-shift-header">
            <div>
              <p className="eyebrow">Upcoming</p>
              <h2 id="next-shift-title">Your next shift</h2>
            </div>
            <span className="next-shift-badge">{dashboard.nextShift ? "Next on schedule" : "No shift selected"}</span>
          </div>
          {dashboard.nextShift ? (
            <div className="next-shift-spotlight">
              <div className="next-shift-main">
                <strong>{dashboard.nextShift.title}</strong>
                <span>{dashboard.nextShift.status.replaceAll("_", " ").toLowerCase()}</span>
              </div>
              <div className="next-shift-details" aria-label="Next shift details">
                <div>
                  <span>Starts</span>
                  <strong>{formatDashboardDate(dashboard.nextShift.startsAt)}</strong>
                </div>
                <div>
                  <span>Ends</span>
                  <strong>{formatDashboardDate(dashboard.nextShift.endsAt)}</strong>
                </div>
                <div>
                  <span>Location</span>
                  <strong>
                    {workspaceLabel("Unit", dashboard.nextShift.unitId)} -{" "}
                    {workspaceLabel("Facility", dashboard.nextShift.facilityId)}
                  </strong>
                </div>
              </div>
              <div className="action-row">
                <form action={dashboard.primaryAction === "CLOCK_IN" ? clockInAction : clockOutAction}>
                  <input type="hidden" name="shiftId" value={dashboard.nextShift.id} />
                  <button className="command-button" type="submit">
                    <Clock3 size={16} aria-hidden="true" />
                    {dashboard.primaryAction === "CLOCK_IN" ? "Clock in" : "Clock out"}
                  </button>
                </form>
                <form action={createSwapAction}>
                  <input type="hidden" name="originalShiftId" value={dashboard.nextShift.id} />
                  <button className="command-button" type="submit">
                    <RefreshCw size={16} aria-hidden="true" />
                    Request swap
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <p className="empty-state">No assigned shifts are visible for this account.</p>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Ask PulseShift</h2>
            <span>Self-service only</span>
          </div>
          <div className="detail-stack">
            <span>Use Copilot for schedule questions, swap previews, and timecard guidance.</span>
            <Link className="command-button" href="/app/copilot">
              <Bot size={16} aria-hidden="true" />
              Open Copilot
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
