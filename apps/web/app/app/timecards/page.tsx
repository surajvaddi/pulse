import { apiGet, type TimecardException } from "@/lib/api";
import { resolveTimecardAction } from "../actions";

export default async function TimecardsPage() {
  const exceptions = await apiGet<TimecardException[]>("/demo/timecards/exceptions");

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Timecard</p>
        <h1>Current pay period</h1>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>Exceptions</h2>
          <span>{exceptions.length} open</span>
        </div>
        <div className="item-list">
          {exceptions.map((exception) => (
            <article className="list-row" key={exception.id}>
              <div>
                <strong>{exception.type.replaceAll("_", " ")}</strong>
                <span>{exception.explanation}</span>
              </div>
              <form action={resolveTimecardAction}>
                <input type="hidden" name="exceptionId" value={exception.id} />
                <button className="command-button" type="submit">
                  {exception.status === "RESOLVED" ? "Resolved" : "Resolve"}
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
