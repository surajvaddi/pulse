"use client";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="page-stack" role="alert">
      <div>
        <p className="eyebrow">Error</p>
        <h1>Workspace data did not load</h1>
      </div>
      <section className="panel detail-stack">
        <strong>{error.message}</strong>
        <span>Reset the view after confirming the API is running.</span>
        <button className="command-button" type="button" onClick={reset}>
          Retry
        </button>
      </section>
    </section>
  );
}
