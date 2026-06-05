import assert from "node:assert/strict";

import { RolePermissionMap, AccountRoleSchema, type AccountRole } from "@pulseshift/domain";

import { defaultLandingRoute } from "@/lib/landing-route";
import { navigationForSession, sessionCanOpenRoute } from "@/lib/navigation";
import { pageContracts, type AppRoute } from "@/lib/page-contracts";

const meaningfulActionsByRole: Record<AccountRole, string[]> = {
  ORGANIZATION_OWNER: ["review_audit", "open_admin_workflow", "suspend_user"],
  SYSTEM_ADMIN: ["open_admin_workflow", "suspend_user", "run_sync", "run_eval_suite"],
  WORKFORCE_ADMIN: ["review_gap", "view_schedule", "open_copilot"],
  UNIT_MANAGER: ["approve_swap", "review_gap"],
  CHARGE_NURSE: ["review_gap", "review_coverage"],
  EMPLOYEE: ["view_next_shift", "claim_shift", "request_swap", "clock_in"],
  FLOAT_POOL_COORDINATOR: ["review_gap", "view_candidates"],
  PAYROLL_ADMIN: ["resolve_exception", "open_copilot"],
  CREDENTIALING_ADMIN: ["review_credentials"],
  COMPLIANCE_AUDITOR: ["review_audit"],
  EXECUTIVE_VIEWER: ["view_schedule", "review_gap"],
  EXTERNAL_AGENCY_ADMIN: ["view_next_shift", "claim_shift"],
  AI_AGENT_SERVICE: ["ask_question", "preview_action"]
};

const deniedRoutesByRole: Record<AccountRole, AppRoute> = {
  ORGANIZATION_OWNER: "/app/open-shifts",
  SYSTEM_ADMIN: "/app/open-shifts",
  WORKFORCE_ADMIN: "/app/timecards",
  UNIT_MANAGER: "/app/admin/users",
  CHARGE_NURSE: "/app/admin/audit",
  EMPLOYEE: "/app/admin/users",
  FLOAT_POOL_COORDINATOR: "/app/admin/users",
  PAYROLL_ADMIN: "/app/admin/users",
  CREDENTIALING_ADMIN: "/app/timecards",
  COMPLIANCE_AUDITOR: "/app/admin/users",
  EXECUTIVE_VIEWER: "/app/admin/users",
  EXTERNAL_AGENCY_ADMIN: "/app/admin/audit",
  AI_AGENT_SERVICE: "/app/admin/audit"
};

for (const role of AccountRoleSchema.options) {
  const session = {
    role,
    permissions: RolePermissionMap[role]
  };
  const landingRoute = defaultLandingRoute(session);
  const navigation = navigationForSession(session);
  assert.ok(navigation.some((item) => item.href === landingRoute), `${role} landing route must be navigable`);
  assert.ok(navigation.length > 0, `${role} must have launch navigation`);

  const visibleActions = navigation.flatMap((item) => item.contract.visibleActions);
  assert.ok(
    meaningfulActionsByRole[role].some((action) => visibleActions.includes(action)),
    `${role} must have at least one meaningful launch action`
  );

  const deniedRoute = deniedRoutesByRole[role];
  assert.equal(sessionCanOpenRoute(session, deniedRoute), false, `${role} must be denied ${deniedRoute}`);
}

assert.ok(pageContracts["/app/admin/audit"].hiddenActions.includes("delete_audit"));
assert.ok(pageContracts["/app/home"].hiddenActions.includes("raw_sql"));
