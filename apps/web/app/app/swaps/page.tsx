import { apiGet, type DemoSwap } from "@/lib/api";
import { acceptSwapAction, approveSwapAction, createSwapAction } from "../actions";

const tabs = ["My Requests", "Requests For Me", "Awaiting Manager", "History"];

export default async function SwapsPage() {
  const swaps = await apiGet<DemoSwap[]>("/workflows/swaps");

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
        {swaps.length === 0 ? (
          <div className="detail-stack">
            <p className="empty-state">No active swaps. Create the Friday night Maya demo swap.</p>
            <form action={createSwapAction}>
              <input type="hidden" name="originalShiftId" value="shift_priya_friday_icu_night" />
              <button className="command-button" type="submit">
                Create Maya swap request
              </button>
            </form>
          </div>
        ) : (
          <div className="item-list">
            {swaps.map((swap) => (
              <article className="panel" key={swap.id}>
                <div className="section-heading">
                  <h2>{swap.id}</h2>
                  <span>{swap.status}</span>
                </div>
                <div className="timeline">
                  {swap.timeline.map((step) => (
                    <span key={step}>{step}</span>
                  ))}
                </div>
                <div className="action-row">
                  {swap.status === "PENDING_COUNTERPARTY" ? (
                    <form action={acceptSwapAction}>
                      <input type="hidden" name="swapId" value={swap.id} />
                      <button className="command-button" type="submit">
                        Maya accepts
                      </button>
                    </form>
                  ) : null}
                  {swap.status === "PENDING_MANAGER" ? (
                    <form action={approveSwapAction}>
                      <input type="hidden" name="swapId" value={swap.id} />
                      <button className="command-button" type="submit">
                        Manager approves
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
