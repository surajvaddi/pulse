import Link from "next/link";
import { ArrowRight, Plug, SkipForward } from "lucide-react";

import { completeIntegrationsOnboardingAction } from "../../account-actions";
import { apiGetWithAccessToken, type IntegrationConnection } from "@/lib/api";
import { requireOnboardingStep } from "@/lib/onboarding-guards";

function formatDate(value: string | null) {
  if (!value) {
    return "Not synced yet";
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function IntegrationsOnboardingPage() {
  const { accessToken } = await requireOnboardingStep("/onboarding/integrations");
  const connections = await apiGetWithAccessToken<IntegrationConnection[]>(
    "/integrations",
    accessToken
  ).catch(() => []);

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Integrations</p>
          <h1>Connect workforce systems when you are ready.</h1>
          <p>
            Review available connectors now or skip and configure them later from the admin
            workspace.
          </p>
        </div>

        <div className="detail-stack">
          {connections.length ? (
            connections.map((connection) => (
              <article className="list-row" key={connection.id}>
                <div>
                  <strong>{connection.displayName}</strong>
                  <span>
                    {connection.system} · {connection.direction.toLowerCase()} sync
                  </span>
                  <span>Last sync {formatDate(connection.lastSyncAt)}</span>
                </div>
                <span className="status-pill">{connection.status}</span>
              </article>
            ))
          ) : (
            <p className="empty-state">No integrations are configured for this workspace yet.</p>
          )}
        </div>

        <div className="action-row">
          <form action={completeIntegrationsOnboardingAction}>
            <input type="hidden" name="action" value="skip" />
            <button className="secondary-button" type="submit">
              <SkipForward size={18} aria-hidden="true" />
              Skip for now
            </button>
          </form>
          <form action={completeIntegrationsOnboardingAction}>
            <input type="hidden" name="action" value="continue" />
            <button className="command-button" type="submit">
              <Plug size={18} aria-hidden="true" />
              Continue to team invites
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
          <Link className="secondary-button" href="/app/admin/integrations">
            Open integration admin
          </Link>
        </div>
      </section>
    </main>
  );
}
