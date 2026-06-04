"use client";

import { ProductionState } from "./production-state";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <ProductionState
      kind="error"
      message={error.message}
      action={
        <button className="command-button" type="button" onClick={reset}>
          Retry
        </button>
      }
    />
  );
}
