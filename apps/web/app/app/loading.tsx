export default function AppLoading() {
  return (
    <section className="page-stack" aria-live="polite" aria-busy="true">
      <div>
        <p className="eyebrow">Loading</p>
        <h1>Preparing workspace</h1>
      </div>
      <section className="dashboard-grid">
        <div className="skeleton-block" />
        <div className="skeleton-block" />
        <div className="skeleton-block" />
      </section>
    </section>
  );
}
