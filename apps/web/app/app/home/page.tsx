import { CalendarDays, Clock3, ShieldCheck } from "lucide-react";

import { apiGet, type DemoShift, type SessionSummary, type TimecardException } from "@/lib/api";

function formatShiftDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric"
  }).format(new Date(value));
}

export default async function HomePage() {
  const [session, shifts, exceptions] = await Promise.all([
    apiGet<SessionSummary>("/auth/me"),
    apiGet<DemoShift[]>("/demo/schedule/me"),
    apiGet<TimecardException[]>("/demo/timecards/exceptions")
  ]);
  const nextShift = shifts[0];
  const exception = exceptions[0];
  const firstName = session.displayName.split(" ").at(0) ?? session.displayName;

  const cards = [
    {
      title: "Next Shift",
      value: nextShift?.title ?? "No upcoming shifts",
      detail: nextShift ? formatShiftDate(nextShift.startsAt) : "Nothing visible for this user",
      icon: CalendarDays
    },
    {
      title: "Pending Requests",
      value: "No active swaps",
      detail: "Start from a shift detail when ready",
      icon: Clock3
    },
    {
      title: "Timecard Exceptions",
      value: exception?.type.replaceAll("_", " ") ?? "None",
      detail: exception?.explanation ?? "No open exceptions",
      icon: ShieldCheck
    }
  ];

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Employee Home</p>
        <h1>Good morning, {firstName}</h1>
      </div>
      <div className="dashboard-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="metric-card" key={card.title}>
              <Icon size={20} aria-hidden="true" />
              <p>{card.title}</p>
              <strong>{card.value}</strong>
              <span>{card.detail}</span>
            </article>
          );
        })}
      </div>
      <section className="copilot-entry">
        <label htmlFor="copilot-prompt">Ask PulseShift</label>
        <input id="copilot-prompt" placeholder="Can I swap Friday night with Maya?" />
      </section>
    </section>
  );
}
