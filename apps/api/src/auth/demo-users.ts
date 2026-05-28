import type { AccountRole, PermissionGrant, Scope } from "@pulseshift/domain";

export type DemoSession = {
  userId: string;
  organizationId: string;
  displayName: string;
  email: string;
  role: AccountRole;
  grants: PermissionGrant[];
};

const orgScope: Scope = {
  type: "ORG",
  organizationId: "org_pulseshift_demo"
};

const icuScope: Scope = {
  type: "UNIT",
  unitIds: ["unit_icu", "unit_ed"]
};

const selfScope: Scope = {
  type: "SELF"
};

export const demoSessions: DemoSession[] = [
  {
    userId: "user_priya",
    organizationId: "org_pulseshift_demo",
    displayName: "Priya Raman",
    email: "priya.nurse@example.com",
    role: "EMPLOYEE",
    grants: [
      { permission: "schedule:read:self", scope: selfScope },
      { permission: "shift:claim", scope: selfScope },
      { permission: "shift:release", scope: selfScope },
      { permission: "shift:swap:create", scope: selfScope },
      { permission: "availability:read:self", scope: selfScope },
      { permission: "availability:write:self", scope: selfScope },
      { permission: "timecard:read:self", scope: selfScope },
      { permission: "ai:use", scope: selfScope }
    ]
  },
  {
    userId: "user_maya",
    organizationId: "org_pulseshift_demo",
    displayName: "Maya Shah",
    email: "maya.shah@example.com",
    role: "EMPLOYEE",
    grants: [
      { permission: "schedule:read:self", scope: selfScope },
      { permission: "shift:swap:create", scope: selfScope },
      { permission: "timecard:read:self", scope: selfScope },
      { permission: "ai:use", scope: selfScope }
    ]
  },
  {
    userId: "user_jordan_manager",
    organizationId: "org_pulseshift_demo",
    displayName: "Jordan Lee",
    email: "jordan.manager@example.com",
    role: "UNIT_MANAGER",
    grants: [
      { permission: "schedule:read:unit", scope: icuScope },
      { permission: "shift:swap:approve", scope: icuScope },
      { permission: "shift:assign", scope: icuScope },
      { permission: "notification:send:unit", scope: icuScope },
      { permission: "timecard:read:unit", scope: icuScope },
      { permission: "ai:use", scope: icuScope }
    ]
  },
  {
    userId: "user_payroll",
    organizationId: "org_pulseshift_demo",
    displayName: "Sam Payroll",
    email: "payroll@example.com",
    role: "PAYROLL_ADMIN",
    grants: [
      { permission: "timecard:read:unit", scope: icuScope },
      { permission: "timecard:resolve", scope: icuScope },
      { permission: "payroll:export", scope: icuScope },
      { permission: "ai:use", scope: icuScope }
    ]
  },
  {
    userId: "user_admin",
    organizationId: "org_pulseshift_demo",
    displayName: "Alex Admin",
    email: "admin@example.com",
    role: "SYSTEM_ADMIN",
    grants: [
      { permission: "integration:manage", scope: orgScope },
      { permission: "user:manage", scope: orgScope },
      { permission: "audit:read", scope: orgScope },
      { permission: "ai:admin", scope: orgScope },
      { permission: "ai:use", scope: orgScope }
    ]
  }
];

export function findDemoSession(userId: string | undefined): DemoSession {
  const session =
    demoSessions.find((candidate) => candidate.userId === userId) ?? demoSessions.at(0);
  if (!session) {
    throw new Error("No demo sessions are configured");
  }
  return session;
}
