import { apiGet, type CoverageCandidate, type StaffingGap } from "@/lib/api";

export default async function StaffingGapsPage() {
  const gaps = await apiGet<StaffingGap[]>("/operations/staffing/gaps", "user_jordan_manager");
  const firstGap = gaps[0];
  const candidates = firstGap
    ? await apiGet<{ candidates: CoverageCandidate[] }>(
        `/operations/staffing/gaps/${firstGap.id}/candidates`,
        "user_jordan_manager"
      )
    : { candidates: [] };

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Staffing Gaps</p>
        <h1>Coverage risk and candidates</h1>
      </div>
      <div className="two-column">
        <section className="panel">
          <div className="section-heading">
            <h2>Gaps</h2>
            <span>{gaps.length} computed</span>
          </div>
          <div className="item-list">
            {gaps.map((gap) => (
              <article className="list-row" key={gap.id}>
                <div>
                  <strong>ICU {gap.role} Night</strong>
                  <span>
                    Required {gap.requiredCount}, assigned {gap.assignedCount}, gap {gap.gapCount}
                  </span>
                </div>
                <span className="status-pill">{gap.severity}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Candidates</h2>
            <span>Ranked</span>
          </div>
          <div className="item-list">
            {candidates.candidates.map((candidate) => (
              <article className="list-row" key={candidate.employeeId}>
                <div>
                  <strong>{candidate.name}</strong>
                  <span>
                    {candidate.eligibility} - {candidate.availability}
                  </span>
                </div>
                <span className="status-pill">{candidate.overtimeRisk}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
