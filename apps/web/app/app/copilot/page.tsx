import { apiPost, type CopilotResponse } from "@/lib/api";
import { askCopilotAction } from "../actions";

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

export default async function CopilotPage({
  searchParams
}: {
  searchParams?: Promise<{ last?: string }>;
}) {
  const params = await searchParams;
  const lastPrompt = params?.last ? decodeURIComponent(params.last) : "When do I work next?";
  const response = await apiPost<CopilotResponse>("/copilot/messages", { message: lastPrompt });

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Copilot</p>
        <h1>Permission-aware workforce questions</h1>
      </div>
      <section className="copilot-entry">
        <label htmlFor="copilot-full">Ask PulseShift</label>
        <form action={askCopilotAction} className="prompt-form">
          <input id="copilot-full" name="message" defaultValue={lastPrompt} />
          <input type="hidden" name="userId" value="user_priya" />
          <button className="command-button" type="submit">
            Ask
          </button>
        </form>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>{response.mode.replace("_", " ")}</h2>
          <span>{response.toolCalls.length} tool call</span>
        </div>
        <p>{response.answer}</p>
        <div className="item-list">
          {response.toolCalls.map((toolCall) => (
            <article className="list-row" key={toolCall.id}>
              <div>
                <strong>{toolCall.toolName}</strong>
                <span>{toolCall.riskLevel}</span>
              </div>
              <span className="status-pill">{toolCall.status}</span>
            </article>
          ))}
        </div>
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
