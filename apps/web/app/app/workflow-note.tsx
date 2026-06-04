import type { AppRoute } from "@/lib/page-contracts";
import { workflowExplanationForRoute } from "@/lib/workflow-explanations";

export function WorkflowNote({ route, role }: { route: AppRoute; role: string }) {
  const explanation = workflowExplanationForRoute(route, role);
  return (
    <aside className="workflow-note">
      <strong>{explanation.title}</strong>
      <span>{explanation.summary}</span>
      <small>{explanation.scope}</small>
    </aside>
  );
}
