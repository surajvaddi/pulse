import type { AccountRole, InvitationStatus, OrganizationStatus, Scope, UserStatus } from "@pulseshift/domain";

import type { FacilityRecord, InvitationRecord, UnitRecord } from "./admin-contracts";

export type AdminOrganizationRecord = {
  id: string;
  name: string;
  timezone: string;
  status: OrganizationStatus;
};

export type AdminUserStateRecord = {
  id: string;
  organizationId: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roles: AccountRole[];
};

export type AdminRoleStateRecord = {
  userId: string;
  role: AccountRole;
  scope: Scope;
  permissions: string[];
};

export type AdminAuditEvent = {
  id: string;
  organizationId: string;
  action: string;
  objectType: string;
  objectId: string;
  reason: string;
  after?: Record<string, unknown>;
};

export const adminOrganizations: AdminOrganizationRecord[] = [
  {
    id: "org_pulseshift_demo",
    name: "PulseShift Demo Health",
    timezone: "America/New_York",
    status: "TRIAL"
  }
];

export const adminFacilities: FacilityRecord[] = [
  {
    id: "fac_mercy_main",
    organizationId: "org_pulseshift_demo",
    name: "Mercy Main",
    timezone: "America/New_York",
    status: "ACTIVE"
  }
];

export const adminUnits: UnitRecord[] = [
  {
    id: "unit_icu",
    facilityId: "fac_mercy_main",
    name: "ICU",
    type: "ICU",
    managerUserIds: ["user_jordan_manager"],
    active: true
  },
  {
    id: "unit_ed",
    facilityId: "fac_mercy_main",
    name: "Emergency Department",
    type: "ED",
    managerUserIds: ["user_jordan_manager"],
    active: true
  }
];

export const adminUsers: AdminUserStateRecord[] = [
  {
    id: "user_admin",
    organizationId: "org_pulseshift_demo",
    email: "admin@example.com",
    displayName: "Alex Admin",
    status: "ACTIVE",
    roles: ["SYSTEM_ADMIN"]
  },
  {
    id: "user_jordan_manager",
    organizationId: "org_pulseshift_demo",
    email: "jordan.manager@example.com",
    displayName: "Jordan Lee",
    status: "ACTIVE",
    roles: ["UNIT_MANAGER"]
  },
  {
    id: "user_priya",
    organizationId: "org_pulseshift_demo",
    email: "priya.nurse@example.com",
    displayName: "Priya Raman",
    status: "ACTIVE",
    roles: ["EMPLOYEE"]
  }
];

export const adminRoles: AdminRoleStateRecord[] = [];

export const adminInvitations: Array<InvitationRecord & { expiresAt: string; tokenVersion: number }> = [];

export const adminAuditEvents: AdminAuditEvent[] = [];

export function appendAdminAuditEvent(input: Omit<AdminAuditEvent, "id">) {
  const event: AdminAuditEvent = {
    id: `admin_audit_${adminAuditEvents.length + 1}`,
    ...input
  };
  adminAuditEvents.push(event);
  return event;
}

export function invitationStatusFor(record: { status: InvitationStatus; expiresAt: string }) {
  if (record.status === "PENDING" && new Date(record.expiresAt).getTime() < Date.now()) {
    return "EXPIRED" as const;
  }
  return record.status;
}
