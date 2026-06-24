import Link from "next/link";
import { Bell, Cable, ListChecks, Users } from "lucide-react";

import {
  apiGetSession,
  type AdminFacility,
  type AdminInvitation,
  type AdminUnit,
  type AdminSetupProgress,
  type AdminUser,
  type AuditLog,
  type IntegrationConnection
} from "@/lib/api";
import { buildAdminDashboard } from "@/lib/admin-dashboard";
import { WorkflowNote } from "../workflow-note";

export default async function AdminDashboardPage() {
  const results = await Promise.allSettled([
    apiGetSession<AdminUser[]>("/admin/users", "user_admin"),
    apiGetSession<AdminFacility[]>("/admin/facilities", "user_admin"),
    apiGetSession<AdminUnit[]>("/admin/units", "user_admin"),
    apiGetSession<AdminInvitation[]>("/admin/invitations", "user_admin"),
    apiGetSession<IntegrationConnection[]>("/integrations", "user_admin"),
    apiGetSession<AuditLog[]>("/demo/audit", "user_admin"),
    apiGetSession<AdminSetupProgress>("/admin/setup-progress", "user_admin")
  ]);
  const value = <T,>(index: number, fallback: T): T =>
    results[index]?.status === "fulfilled"
      ? (results[index].value as T)
      : fallback;
  const users = value<AdminUser[]>(0, []);
  const facilities = value<AdminFacility[]>(1, []);
  const units = value<AdminUnit[]>(2, []);
  const invitations = value<AdminInvitation[]>(3, []);
  const integrations = value<IntegrationConnection[]>(4, []);
  const auditLogs = value<AuditLog[]>(5, []);
  const setup = value<AdminSetupProgress>(6, {
    completed: 0,
    total: 0,
    items: []
  });
  const failedPanels = [
    "Users",
    "Facilities",
    "Units",
    "Invitations",
    "Integrations",
    "Audit activity",
    "Setup progress"
  ].filter((_, index) => results[index]?.status === "rejected");
  const dashboard = buildAdminDashboard({
    users,
    facilities,
    units,
    invitations,
    integrations,
    auditLogs
  });
  const icons = [Users, ListChecks, Bell, Cable];

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">System Administration</p>
        <h1>Organization control center</h1>
        <p>Monitor accounts, facilities, invitations, integrations, and audit activity.</p>
      </div>
      <WorkflowNote route="/app/admin" role="SYSTEM_ADMIN" />

      {failedPanels.length ? (
        <section className="panel" role="status">
          <div className="section-heading">
            <h2>Some admin data is unavailable</h2>
            <span>Retry this page</span>
          </div>
          <p className="empty-state">
            {failedPanels.join(", ")} could not be loaded. Available sections remain usable.
          </p>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-heading">
          <h2>Workspace setup</h2>
          <span>{setup.completed} of {setup.total} complete</span>
        </div>
        <div className="item-list">
          {setup.items.map((item) => (
            <article className="list-row" key={item.id}>
              <div>
                <strong>{item.label ?? item.id}</strong>
                <span>{item.complete ? "Configured" : "Action required"}</span>
              </div>
              {item.complete ? (
                <span className="status-pill">Ready</span>
              ) : item.href ? (
                <Link className="command-button" href={item.href}>Configure</Link>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <div className="dashboard-grid">
        {dashboard.cards.map((card, index) => {
          const Icon = icons[index] ?? ListChecks;
          return (
            <article className={`metric-card metric-card-${card.tone}`} key={card.title}>
              <Icon size={20} aria-hidden="true" />
              <p>{card.title}</p>
              <strong>{card.value}</strong>
              <span>{card.detail}</span>
            </article>
          );
        })}
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="section-heading">
            <h2>Admin Workflows</h2>
            <span>Role-gated actions</span>
          </div>
          <div className="action-row">
            <Link className="command-button" href="/app/admin/users">
              Manage users
            </Link>
            <Link className="command-button" href="/app/admin/invitations">
              Invite staff
            </Link>
            <Link className="command-button" href="/app/admin/integrations">
              Review sync
            </Link>
            <Link className="command-button" href="/app/admin/audit">
              Audit log
            </Link>
            <Link className="command-button" href="/app/admin/notifications">
              Delivery failures
            </Link>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Needs Attention</h2>
            <span>
              {dashboard.suspendedUsers.length +
                dashboard.pendingInvitations.length +
                dashboard.inactiveIntegrations.length}{" "}
              items
            </span>
          </div>
          <div className="item-list">
            {dashboard.pendingInvitations.map((invitation) => (
              <article className="list-row" key={invitation.id}>
                <div>
                  <strong>{invitation.email}</strong>
                  <span>{invitation.role}</span>
                </div>
                <span className="status-pill">{invitation.status}</span>
              </article>
            ))}
            {dashboard.inactiveIntegrations.map((integration) => (
              <article className="list-row" key={integration.id}>
                <div>
                  <strong>{integration.displayName}</strong>
                  <span>{integration.direction}</span>
                </div>
                <span className="status-pill">{integration.status}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <h2>Recent Audit Activity</h2>
          <span>{auditLogs.length} records</span>
        </div>
        <div className="item-list">
          {dashboard.recentAuditLogs.map((log) => (
            <article className="list-row" key={log.id}>
              <div>
                <strong>{log.action}</strong>
                <span>
                  {log.objectType}: {log.objectId}
                </span>
              </div>
              <span className="status-pill">{log.actorType}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
