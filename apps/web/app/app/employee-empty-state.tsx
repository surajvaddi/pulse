import Link from "next/link";

import {
  employeeEmptyState,
  type EmployeeEmptyStateKind
} from "@/lib/employee-empty-state";

export function EmployeeEmptyState({ kind }: { kind: EmployeeEmptyStateKind }) {
  const state = employeeEmptyState(kind);
  return (
    <div className="empty-state">
      <p className="eyebrow">{state.eyebrow}</p>
      <strong>{state.title}</strong>
      <span>{state.message}</span>
      <Link className="secondary-button" href={state.actionHref}>
        {state.actionLabel}
      </Link>
    </div>
  );
}
