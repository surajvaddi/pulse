import { CalendarDays, Clock3, ShieldCheck } from "lucide-react";

const cards = [
  {
    title: "Next Shift",
    value: "ICU RN Night",
    detail: "Fri, May 29, 7 PM to 7 AM",
    icon: CalendarDays
  },
  {
    title: "Pending Requests",
    value: "No active swaps",
    detail: "Start from a shift detail when ready",
    icon: Clock3
  },
  {
    title: "Policy Status",
    value: "Scoped access active",
    detail: "Only self schedule data is visible",
    icon: ShieldCheck
  }
];

export default function HomePage() {
  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Employee Home</p>
        <h1>Good morning, Priya</h1>
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

