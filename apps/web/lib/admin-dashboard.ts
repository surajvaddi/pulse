import type {
  AdminFacility,
  AdminInvitation,
  AdminUnit,
  AdminUser,
  AuditLog,
  IntegrationConnection
} from "@/lib/api";

export type AdminDashboardModel = {
  cards: Array<{
    title: string;
    value: string;
    detail: string;
    tone: "neutral" | "ready" | "attention";
  }>;
  suspendedUsers: AdminUser[];
  pendingInvitations: AdminInvitation[];
  inactiveIntegrations: IntegrationConnection[];
  recentAuditLogs: AuditLog[];
};

export function buildAdminDashboard(input: {
  users: AdminUser[];
  facilities: AdminFacility[];
  units: AdminUnit[];
  invitations: AdminInvitation[];
  integrations: IntegrationConnection[];
  auditLogs: AuditLog[];
}): AdminDashboardModel {
  const suspendedUsers = input.users.filter((user) => user.status !== "ACTIVE");
  const pendingInvitations = input.invitations.filter((invitation) => invitation.status === "PENDING");
  const inactiveIntegrations = input.integrations.filter(
    (integration) => integration.status !== "CONNECTED"
  );

  return {
    suspendedUsers,
    pendingInvitations,
    inactiveIntegrations,
    recentAuditLogs: input.auditLogs.slice(-5).reverse(),
    cards: [
      {
        title: "Accounts",
        value: String(input.users.length),
        detail: `${suspendedUsers.length} need admin review`,
        tone: suspendedUsers.length > 0 ? "attention" : "ready"
      },
      {
        title: "Facilities",
        value: String(input.facilities.length),
        detail: `${input.units.length} active unit records`,
        tone: input.facilities.length > 0 ? "ready" : "attention"
      },
      {
        title: "Invitations",
        value: String(pendingInvitations.length),
        detail: "Pending account creation",
        tone: pendingInvitations.length > 0 ? "attention" : "neutral"
      },
      {
        title: "Integrations",
        value: String(input.integrations.length),
        detail: `${inactiveIntegrations.length} need sync attention`,
        tone: inactiveIntegrations.length > 0 ? "attention" : "ready"
      }
    ]
  };
}
