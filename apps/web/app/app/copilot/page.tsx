const promptGroups = [
  {
    title: "Employee",
    prompts: ["When do I work next?", "Can I swap Friday?", "Why was my clock-in flagged?"]
  },
  {
    title: "Manager",
    prompts: [
      "Where are we short tomorrow?",
      "Find ICU-qualified nurses available tonight.",
      "Summarize overtime risk this week."
    ]
  }
];

export default function CopilotPage() {
  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Copilot</p>
        <h1>Permission-aware workforce questions</h1>
      </div>
      <section className="copilot-entry">
        <label htmlFor="copilot-full">Ask PulseShift</label>
        <input id="copilot-full" placeholder="Where are we short tomorrow night?" />
      </section>
      <div className="dashboard-grid">
        {promptGroups.map((group) => (
          <article className="panel" key={group.title}>
            <div className="section-heading">
              <h2>{group.title}</h2>
              <span>Prompt examples</span>
            </div>
            <div className="item-list">
              {group.prompts.map((prompt) => (
                <button className="command-button" key={prompt}>
                  {prompt}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

