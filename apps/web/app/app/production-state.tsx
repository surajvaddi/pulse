import type { ReactNode } from "react";

import { productionStateFor, type ProductionStateKind } from "@/lib/production-states";

export function ProductionState({
  kind,
  title,
  message,
  action,
  busy = false
}: {
  kind: ProductionStateKind;
  title?: string;
  message?: string;
  action?: ReactNode;
  busy?: boolean;
}) {
  const copy = productionStateFor(kind, {
    ...(title ? { title } : {}),
    ...(message ? { message } : {})
  });
  return (
    <section className="page-stack production-state" aria-busy={busy} role={kind === "error" ? "alert" : undefined}>
      <div className="page-hero">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.message}</p>
      </div>
      {kind === "loading" ? (
        <section className="dashboard-grid" aria-hidden="true">
          <div className="skeleton-block" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </section>
      ) : (
        <section className="panel detail-stack">
          <strong>{copy.title}</strong>
          <span>{copy.message}</span>
          {action}
        </section>
      )}
    </section>
  );
}
