import Link from "next/link";
import { Bell, Cable, ListChecks, Users } from "lucide-react";

import {
  apiGet,
  type AdminFacility,
  type AdminInvitation,
  type AdminUnit,
  type AdminUser,
  type AuditLog,
  type IntegrationConnection
} from "@/lib/api";
import { buildAdminDashboard } from "@/lib/admin-dashboard";
import { WorkflowNote } from "../workflow-note";

export default async function AdminDashboardPage() {
  const [users, facilities, units, invitations, integrations, auditLogs] = await Promise.all([
    apiGet<AdminUser[]>("/admin/users", "user_admin"),
    apiGet<AdminFacility[]>("/admin/facilities", "user_admin"),
    apiGet<AdminUnit[]>("/admin/units", "user_admin"),
    apiGet<AdminInvitation[]>("/admin/invitations", "user_admin"),
    apiGet<IntegrationConnection[]>("/integrations", "user_admin"),
    apiGet<AuditLog[]>("/demo/audit", "user_admin")
  ]);
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
