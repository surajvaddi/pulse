export default function ForbiddenState() {
  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Forbidden</p>
        <h1>Permission scope required</h1>
      </div>
      <section className="panel detail-stack">
        <strong>The current demo user cannot open this workspace area.</strong>
        <span>Switch to an authorized demo user in the top bar or return to Home.</span>
      </section>
    </section>
  );
}
