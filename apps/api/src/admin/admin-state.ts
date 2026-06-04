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
    id: "user_owner",
    organizationId: "org_pulseshift_demo",
    email: "owner@example.com",
    displayName: "Morgan Owner",
    status: "ACTIVE",
    roles: ["ORGANIZATION_OWNER"]
  },
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
    id: "user_olivia_charge",
    organizationId: "org_pulseshift_demo",
    email: "olivia.charge@example.com",
    displayName: "Olivia Charge",
    status: "ACTIVE",
    roles: ["CHARGE_NURSE"]
  },
  {
    id: "user_wendy_workforce",
    organizationId: "org_pulseshift_demo",
    email: "wendy.workforce@example.com",
    displayName: "Wendy Workforce",
    status: "ACTIVE",
    roles: ["WORKFORCE_ADMIN"]
  },
  {
    id: "user_felix_float",
    organizationId: "org_pulseshift_demo",
    email: "felix.float@example.com",
    displayName: "Felix Float",
    status: "ACTIVE",
    roles: ["FLOAT_POOL_COORDINATOR"]
  },
  {
    id: "user_payroll",
    organizationId: "org_pulseshift_demo",
    email: "payroll@example.com",
    displayName: "Sam Payroll",
    status: "ACTIVE",
    roles: ["PAYROLL_ADMIN"]
  },
  {
    id: "user_carmen_credentials",
    organizationId: "org_pulseshift_demo",
    email: "carmen.credentials@example.com",
    displayName: "Carmen Credentials",
    status: "ACTIVE",
    roles: ["CREDENTIALING_ADMIN"]
  },
  {
    id: "user_avery_auditor",
    organizationId: "org_pulseshift_demo",
    email: "avery.auditor@example.com",
    displayName: "Avery Auditor",
    status: "ACTIVE",
    roles: ["COMPLIANCE_AUDITOR"]
  },
  {
    id: "user_evan_exec",
    organizationId: "org_pulseshift_demo",
    email: "evan.executive@example.com",
    displayName: "Evan Executive",
    status: "ACTIVE",
    roles: ["EXECUTIVE_VIEWER"]
  },
  {
    id: "user_priya",
    organizationId: "org_pulseshift_demo",
    email: "priya.nurse@example.com",
    displayName: "Priya Raman",
    status: "ACTIVE",
    roles: ["EMPLOYEE"]
  },
  {
    id: "user_maya",
    organizationId: "org_pulseshift_demo",
    email: "maya.shah@example.com",
    displayName: "Maya Shah",
    status: "ACTIVE",
    roles: ["EMPLOYEE"]
  },
  {
    id: "user_aria_agency",
    organizationId: "org_pulseshift_demo",
    email: "aria.agency@example.com",
    displayName: "Aria Agency",
    status: "ACTIVE",
    roles: ["EXTERNAL_AGENCY_ADMIN"]
  },
  {
    id: "user_ai_service",
    organizationId: "org_pulseshift_demo",
    email: "ai.service@example.com",
    displayName: "PulseShift AI Service",
    status: "ACTIVE",
    roles: ["AI_AGENT_SERVICE"]
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
