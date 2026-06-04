import { RolePermissionMap, type AccountRole, type PermissionGrant, type Scope } from "@pulseshift/domain";

export type DemoSession = {
  userId: string;
  supabaseAuthId?: string;
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

const facilityScope: Scope = {
  type: "FACILITY",
  facilityIds: ["fac_mercy_main"]
};

const selfScope: Scope = {
  type: "SELF"
};

function grantsFor(role: AccountRole, scope: Scope): PermissionGrant[] {
  return RolePermissionMap[role].map((permission) => ({ permission, scope }));
}

export const demoSessions: DemoSession[] = [
  {
    userId: "user_priya",
    supabaseAuthId: "supabase_user_priya",
    organizationId: "org_pulseshift_demo",
    displayName: "Priya Raman",
    email: "priya.nurse@example.com",
    role: "EMPLOYEE",
    grants: grantsFor("EMPLOYEE", selfScope)
  },
  {
    userId: "user_maya",
    supabaseAuthId: "supabase_user_maya",
    organizationId: "org_pulseshift_demo",
    displayName: "Maya Shah",
    email: "maya.shah@example.com",
    role: "EMPLOYEE",
    grants: grantsFor("EMPLOYEE", selfScope)
  },
  {
    userId: "user_jordan_manager",
    supabaseAuthId: "supabase_user_jordan_manager",
    organizationId: "org_pulseshift_demo",
    displayName: "Jordan Lee",
    email: "jordan.manager@example.com",
    role: "UNIT_MANAGER",
    grants: grantsFor("UNIT_MANAGER", icuScope)
  },
  {
    userId: "user_olivia_charge",
    supabaseAuthId: "supabase_user_olivia_charge",
    organizationId: "org_pulseshift_demo",
    displayName: "Olivia Charge",
    email: "olivia.charge@example.com",
    role: "CHARGE_NURSE",
    grants: grantsFor("CHARGE_NURSE", icuScope)
  },
  {
    userId: "user_wendy_workforce",
    supabaseAuthId: "supabase_user_wendy_workforce",
    organizationId: "org_pulseshift_demo",
    displayName: "Wendy Workforce",
    email: "wendy.workforce@example.com",
    role: "WORKFORCE_ADMIN",
    grants: grantsFor("WORKFORCE_ADMIN", facilityScope)
  },
  {
    userId: "user_felix_float",
    supabaseAuthId: "supabase_user_felix_float",
    organizationId: "org_pulseshift_demo",
    displayName: "Felix Float",
    email: "felix.float@example.com",
    role: "FLOAT_POOL_COORDINATOR",
    grants: grantsFor("FLOAT_POOL_COORDINATOR", facilityScope)
  },
  {
    userId: "user_payroll",
    supabaseAuthId: "supabase_user_payroll",
    organizationId: "org_pulseshift_demo",
    displayName: "Sam Payroll",
    email: "payroll@example.com",
    role: "PAYROLL_ADMIN",
    grants: grantsFor("PAYROLL_ADMIN", icuScope)
  },
  {
    userId: "user_carmen_credentials",
    supabaseAuthId: "supabase_user_carmen_credentials",
    organizationId: "org_pulseshift_demo",
    displayName: "Carmen Credentials",
    email: "carmen.credentials@example.com",
    role: "CREDENTIALING_ADMIN",
    grants: grantsFor("CREDENTIALING_ADMIN", orgScope)
  },
  {
    userId: "user_avery_auditor",
    supabaseAuthId: "supabase_user_avery_auditor",
    organizationId: "org_pulseshift_demo",
    displayName: "Avery Auditor",
    email: "avery.auditor@example.com",
    role: "COMPLIANCE_AUDITOR",
    grants: grantsFor("COMPLIANCE_AUDITOR", orgScope)
  },
  {
    userId: "user_evan_exec",
    supabaseAuthId: "supabase_user_evan_exec",
    organizationId: "org_pulseshift_demo",
    displayName: "Evan Executive",
    email: "evan.executive@example.com",
    role: "EXECUTIVE_VIEWER",
    grants: grantsFor("EXECUTIVE_VIEWER", facilityScope)
  },
  {
    userId: "user_aria_agency",
    supabaseAuthId: "supabase_user_aria_agency",
    organizationId: "org_pulseshift_demo",
    displayName: "Aria Agency",
    email: "aria.agency@example.com",
    role: "EXTERNAL_AGENCY_ADMIN",
    grants: grantsFor("EXTERNAL_AGENCY_ADMIN", selfScope)
  },
  {
    userId: "user_owner",
    supabaseAuthId: "supabase_user_owner",
    organizationId: "org_pulseshift_demo",
    displayName: "Morgan Owner",
    email: "owner@example.com",
    role: "ORGANIZATION_OWNER",
    grants: grantsFor("ORGANIZATION_OWNER", orgScope)
  },
  {
    userId: "user_admin",
    supabaseAuthId: "supabase_user_admin",
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
  },
  {
    userId: "user_ai_service",
    supabaseAuthId: "supabase_user_ai_service",
    organizationId: "org_pulseshift_demo",
    displayName: "PulseShift AI Service",
    email: "ai.service@example.com",
    role: "AI_AGENT_SERVICE",
    grants: grantsFor("AI_AGENT_SERVICE", orgScope)
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

export function findDemoSessionBySupabaseAuthId(supabaseAuthId: string | undefined): DemoSession {
  const session = demoSessions.find((candidate) => candidate.supabaseAuthId === supabaseAuthId);
  if (!session) {
    throw new Error("Supabase auth user is not linked to an active PulseShift user");
  }
  return session;
}
