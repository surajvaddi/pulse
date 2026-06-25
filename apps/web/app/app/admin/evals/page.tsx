import { PlayCircle } from "lucide-react";

import { runCopilotEvalAction } from "@/app/app/actions";
import { apiGetSession, type CopilotEvalRun, type CopilotEvalTask } from "@/lib/api";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default async function CopilotEvalsPage() {
  const [tasks, runs] = await Promise.all([
    apiGetSession<CopilotEvalTask[]>("/evals/copilot/tasks", "user_admin"),
    apiGetSession<CopilotEvalRun[]>("/evals/copilot/runs", "user_admin")
  ]);
  const latestRun = runs[0];
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">LLM evaluation</p>
        <h1>Copilot safety harness</h1>
      </div>

      <section className="dashboard-grid">
        <article className="metric-card">
          <span>Primary safety metric</span>
          <strong>{latestRun ? percent(latestRun.metrics.unsafeActionAttemptRate) : "No run"}</strong>
          <span>Unsafe action attempt rate</span>
        </article>
        <article className="metric-card">
          <span>Tool routing</span>
          <strong>{latestRun ? percent(latestRun.metrics.toolSelectionAccuracy) : "No run"}</strong>
          <span>Expected tool selection accuracy</span>
        </article>
        <article className="metric-card">
          <span>Final answer</span>
          <strong>{latestRun ? percent(latestRun.metrics.finalAnswerCorrectness) : "No run"}</strong>
          <span>Required signal coverage</span>
        </article>
        <article className="metric-card">
          <span>Suite result</span>
          <strong>
            {latestRun ? `${latestRun.passedCount}/${latestRun.taskCount}` : `${tasks.length} tasks`}
          </strong>
          <span>Tasks passing</span>
        </article>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <h2>Latest run</h2>
            <span>{latestRun?.createdAt ?? "Not run yet"}</span>
          </div>
          {latestRun ? (
            <div className="item-list">
              {latestRun.results.map((result) => {
                const task = taskById.get(result.taskId);
                return (
                  <article className="list-row" key={result.taskId}>
                    <div>
                      <strong>{task?.title ?? result.taskId}</strong>
                      <span>{task?.actorRole ?? "Unknown role"} · {task?.page ?? "/app/copilot"}</span>
                      <span>Prompt: {task?.prompt ?? "Unavailable"}</span>
                      <span>
                        Tools {percent(result.toolSelectionAccuracy)} · Answer{" "}
                        {percent(result.answerSignalCoverage)} · Arguments{" "}
                        {percent(result.argumentAccuracy)}
                      </span>
                      <span>Offered: {result.offeredTools.join(", ") || "None"}</span>
                      <span>
                        Proposed: {result.proposedTool ?? "None"} · Expected:{" "}
                        {task?.expectedTools.join(", ") || "None"}
                      </span>
                      {result.normalizedArguments ? (
                        <span>Arguments: {JSON.stringify(result.normalizedArguments)}</span>
                      ) : null}
                      {result.policyDecision ? <span>Policy: {result.policyDecision}</span> : null}
                      {result.failureCategory ? <span>Failure: {result.failureCategory}</span> : null}
                      {result.notes.length ? <span>{result.notes.join(" ")}</span> : <span>All checks passed.</span>}
                    </div>
                    <span className="status-pill">{result.passed ? "PASS" : "REVIEW"}</span>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">Run the suite to score the current copilot behavior.</p>
          )}
        </div>

        <aside className="panel">
          <div className="section-heading">
            <h2>Eval controls</h2>
          </div>
          <form action={runCopilotEvalAction} className="detail-stack">
            <button className="command-button" type="submit">
              <PlayCircle size={16} aria-hidden="true" />
              Run suite
            </button>
          </form>
          <div className="detail-stack">
            {tasks.map((task) => (
              <article className="detail-stack" key={task.id}>
                <strong>{task.title}</strong>
                <span>{task.prompt}</span>
                <span>Expected: {task.expectedTools.join(", ")}</span>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </section>
  );
}
