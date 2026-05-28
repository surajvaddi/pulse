const tabs = ["My Requests", "Requests For Me", "Awaiting Manager", "History"];

export default function SwapsPage() {
  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Swap Center</p>
        <h1>Shift swap requests</h1>
      </div>
      <div className="tab-row">
        {tabs.map((tab) => (
          <button className="tab-button" key={tab}>
            {tab}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="timeline">
          <span>Created</span>
          <span>Counterparty accepted</span>
          <span>Manager approval pending</span>
          <span>Approved</span>
        </div>
        <p className="empty-state">Swap workflow actions are wired in Phase 4.</p>
      </section>
    </section>
  );
}

