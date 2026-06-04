import type { AccountRole, Permission, Scope } from "@pulseshift/domain";

export type AppRoute =
  | "/app/home"
  | "/app/schedule"
  | "/app/open-shifts"
  | "/app/swaps"
  | "/app/timecards"
  | "/app/staffing-gaps"
  | "/app/staff"
  | "/app/manager"
  | "/app/notifications"
  | "/app/copilot"
  | "/app/admin"
  | "/app/admin/audit"
  | "/app/admin/credentials"
  | "/app/admin/evals"
  | "/app/admin/facilities"
  | "/app/admin/integrations"
  | "/app/admin/invitations"
  | "/app/admin/roles"
  | "/app/admin/units"
  | "/app/admin/users";

export type PageInteractionContract = {
  route: AppRoute;
  label: string;
  allowedRoles: AccountRole[];
  requiredPermissions: Permission[];
  requiredScope: Scope["type"];
  visibleActions: string[];
  hiddenActions: string[];
  emptyState: string;
  forbiddenState: string;
  llmContext: "SELF_SERVICE" | "MANAGER_OPS" | "PAYROLL" | "ADMIN" | "NONE";
};

export const appRoutes: AppRoute[] = [
  "/app/home",
  "/app/schedule",
  "/app/open-shifts",
  "/app/swaps",
  "/app/timecards",
  "/app/staffing-gaps",
  "/app/staff",
  "/app/manager",
  "/app/notifications",
  "/app/copilot",
  "/app/admin",
  "/app/admin/audit",
  "/app/admin/credentials",
  "/app/admin/evals",
  "/app/admin/facilities",
  "/app/admin/integrations",
  "/app/admin/invitations",
  "/app/admin/roles",
  "/app/admin/units",
  "/app/admin/users"
];

const employeeRoles: AccountRole[] = ["EMPLOYEE", "EXTERNAL_AGENCY_ADMIN"];
const managerRoles: AccountRole[] = ["UNIT_MANAGER", "CHARGE_NURSE", "FLOAT_POOL_COORDINATOR"];
const payrollRoles: AccountRole[] = ["PAYROLL_ADMIN"];
const adminRoles: AccountRole[] = [
  "ORGANIZATION_OWNER",
  "SYSTEM_ADMIN",
  "WORKFORCE_ADMIN",
  "CREDENTIALING_ADMIN",
  "COMPLIANCE_AUDITOR",
  "EXECUTIVE_VIEWER"
];
const aiRole: AccountRole[] = ["AI_AGENT_SERVICE"];

function contract(input: PageInteractionContract): PageInteractionContract {
  return input;
}

export const pageContracts: Record<AppRoute, PageInteractionContract> = {
  "/app/home": contract({
    route: "/app/home",
    label: "Home",
    allowedRoles: [...employeeRoles, ...managerRoles, ...payrollRoles, ...adminRoles],
    requiredPermissions: ["ai:use"],
    requiredScope: "SELF",
    visibleActions: ["view_next_shift", "open_copilot"],
    hiddenActions: ["manage_users", "raw_sql"],
    emptyState: "No work summary is visible for this account.",
    forbiddenState: "Sign in with an active workforce account.",
    llmContext: "SELF_SERVICE"
  }),
  "/app/schedule": contract({
    route: "/app/schedule",
    label: "Schedule",
    allowedRoles: [...employeeRoles, ...managerRoles, ...adminRoles, ...payrollRoles],
    requiredPermissions: ["schedule:read:self"],
    requiredScope: "SELF",
    visibleActions: ["view_schedule", "request_swap"],
    hiddenActions: ["direct_edit_without_permission"],
    emptyState: "No shifts match this schedule view.",
    forbiddenState: "This schedule is outside your assigned scope.",
    llmContext: "SELF_SERVICE"
  }),
  "/app/open-shifts": contract({
    route: "/app/open-shifts",
    label: "Open Shifts",
    allowedRoles: [...employeeRoles, ...managerRoles],
    requiredPermissions: ["shift:claim"],
    requiredScope: "SELF",
    visibleActions: ["claim_shift"],
    hiddenActions: ["force_assign_shift"],
    emptyState: "No open shifts are available.",
    forbiddenState: "Open-shift claiming is not available for this role.",
    llmContext: "SELF_SERVICE"
  }),
  "/app/swaps": contract({
    route: "/app/swaps",
    label: "Swaps",
    allowedRoles: [...employeeRoles, ...managerRoles],
    requiredPermissions: ["ai:use"],
    requiredScope: "SELF",
    visibleActions: ["create_swap", "accept_swap", "decline_swap"],
    hiddenActions: ["approve_without_manager_scope"],
    emptyState: "No swap requests are waiting.",
    forbiddenState: "Swap requests are outside your current scope.",
    llmContext: "SELF_SERVICE"
  }),
  "/app/timecards": contract({
    route: "/app/timecards",
    label: "Timecards",
    allowedRoles: [...employeeRoles, ...managerRoles, ...payrollRoles],
    requiredPermissions: ["timecard:read:self"],
    requiredScope: "SELF",
    visibleActions: ["clock_in", "clock_out", "resolve_exception"],
    hiddenActions: ["edit_locked_payroll"],
    emptyState: "No timecard events or exceptions are visible.",
    forbiddenState: "Timecards are outside your assigned scope.",
    llmContext: "PAYROLL"
  }),
  "/app/staffing-gaps": contract({
    route: "/app/staffing-gaps",
    label: "Staffing",
    allowedRoles: [...managerRoles, ...adminRoles],
    requiredPermissions: ["schedule:read:unit"],
    requiredScope: "UNIT",
    visibleActions: ["review_gap", "view_candidates"],
    hiddenActions: ["auto_assign_without_approval"],
    emptyState: "No staffing gaps are currently visible.",
    forbiddenState: "Staffing gaps require unit or organization scope.",
    llmContext: "MANAGER_OPS"
  }),
  "/app/staff": contract({
    route: "/app/staff",
    label: "Staff",
    allowedRoles: [...employeeRoles, ...managerRoles, ...adminRoles],
    requiredPermissions: ["schedule:read:self"],
    requiredScope: "SELF",
    visibleActions: ["view_staff_directory"],
    hiddenActions: ["view_private_credentials_without_scope"],
    emptyState: "No staff members match the current view.",
    forbiddenState: "Staff details are outside your assigned scope.",
    llmContext: "MANAGER_OPS"
  }),
  "/app/manager": contract({
    route: "/app/manager",
    label: "Manager",
    allowedRoles: managerRoles,
    requiredPermissions: ["schedule:read:unit"],
    requiredScope: "UNIT",
    visibleActions: ["review_coverage", "approve_swap"],
    hiddenActions: ["global_admin_controls"],
    emptyState: "No manager actions are pending.",
    forbiddenState: "Manager workspace requires unit management scope.",
    llmContext: "MANAGER_OPS"
  }),
  "/app/notifications": contract({
    route: "/app/notifications",
    label: "Notifications",
    allowedRoles: [...employeeRoles, ...managerRoles, ...payrollRoles, ...adminRoles],
    requiredPermissions: ["ai:use"],
    requiredScope: "SELF",
    visibleActions: ["mark_read"],
    hiddenActions: ["send_broadcast_without_scope"],
    emptyState: "No notifications are waiting.",
    forbiddenState: "Notifications require an active account.",
    llmContext: "NONE"
  }),
  "/app/copilot": contract({
    route: "/app/copilot",
    label: "Copilot",
    allowedRoles: [...employeeRoles, ...managerRoles, ...payrollRoles, ...adminRoles, ...aiRole],
    requiredPermissions: ["ai:use"],
    requiredScope: "SELF",
    visibleActions: ["ask_question", "preview_action"],
    hiddenActions: ["raw_sql", "unsafe_direct_mutation"],
    emptyState: "Start with a workforce question.",
    forbiddenState: "Copilot is unavailable for this role.",
    llmContext: "SELF_SERVICE"
  }),
  "/app/admin": contract({
    route: "/app/admin",
    label: "Admin",
    allowedRoles: adminRoles,
    requiredPermissions: ["user:manage"],
    requiredScope: "ORG",
    visibleActions: ["review_admin_health", "open_admin_workflow"],
    hiddenActions: ["cross_org_access", "raw_permission_entry"],
    emptyState: "No administration summary is available.",
    forbiddenState: "Administration overview requires organization admin scope.",
    llmContext: "ADMIN"
  }),
  "/app/admin/audit": contract({
    route: "/app/admin/audit",
    label: "Audit",
    allowedRoles: adminRoles,
    requiredPermissions: ["audit:read"],
    requiredScope: "ORG",
    visibleActions: ["review_audit"],
    hiddenActions: ["delete_audit"],
    emptyState: "No audit records are available.",
    forbiddenState: "Audit review requires organization admin scope.",
    llmContext: "ADMIN"
  }),
  "/app/admin/credentials": contract({
    route: "/app/admin/credentials",
    label: "Credentials",
    allowedRoles: adminRoles,
    requiredPermissions: ["credential:read"],
    requiredScope: "ORG",
    visibleActions: ["review_credentials"],
    hiddenActions: ["override_without_reason"],
    emptyState: "No credential warnings are visible.",
    forbiddenState: "Credential review requires admin scope.",
    llmContext: "ADMIN"
  }),
  "/app/admin/evals": contract({
    route: "/app/admin/evals",
    label: "Evals",
    allowedRoles: adminRoles,
    requiredPermissions: ["ai:admin"],
    requiredScope: "ORG",
    visibleActions: ["run_eval_suite"],
    hiddenActions: ["change_model_without_config"],
    emptyState: "No eval runs have been recorded.",
    forbiddenState: "AI evals require admin scope.",
    llmContext: "ADMIN"
  }),
  "/app/admin/facilities": contract({
    route: "/app/admin/facilities",
    label: "Facilities",
    allowedRoles: adminRoles,
    requiredPermissions: ["user:manage"],
    requiredScope: "ORG",
    visibleActions: ["create_facility", "update_facility", "deactivate_facility"],
    hiddenActions: ["cross_org_access"],
    emptyState: "No facilities are configured.",
    forbiddenState: "Facility administration requires organization admin scope.",
    llmContext: "ADMIN"
  }),
  "/app/admin/integrations": contract({
    route: "/app/admin/integrations",
    label: "Integrations",
    allowedRoles: adminRoles,
    requiredPermissions: ["integration:manage"],
    requiredScope: "ORG",
    visibleActions: ["run_sync", "preview_import"],
    hiddenActions: ["bypass_validation"],
    emptyState: "No integrations are configured.",
    forbiddenState: "Integration administration requires admin scope.",
    llmContext: "ADMIN"
  }),
  "/app/admin/invitations": contract({
    route: "/app/admin/invitations",
    label: "Invites",
    allowedRoles: adminRoles,
    requiredPermissions: ["user:manage"],
    requiredScope: "ORG",
    visibleActions: ["send_invite", "revoke_invite", "resend_invite"],
    hiddenActions: ["invite_without_role"],
    emptyState: "No invitations are pending.",
    forbiddenState: "Invitation administration requires organization admin scope.",
    llmContext: "ADMIN"
  }),
  "/app/admin/roles": contract({
    route: "/app/admin/roles",
    label: "Roles",
    allowedRoles: adminRoles,
    requiredPermissions: ["user:manage"],
    requiredScope: "ORG",
    visibleActions: ["assign_role", "update_scope", "remove_role"],
    hiddenActions: ["raw_permission_entry"],
    emptyState: "No role assignments are visible.",
    forbiddenState: "Role administration requires organization admin scope.",
    llmContext: "ADMIN"
  }),
  "/app/admin/units": contract({
    route: "/app/admin/units",
    label: "Units",
    allowedRoles: adminRoles,
    requiredPermissions: ["user:manage"],
    requiredScope: "ORG",
    visibleActions: ["create_unit", "assign_manager", "deactivate_unit"],
    hiddenActions: ["cross_org_access"],
    emptyState: "No units are configured.",
    forbiddenState: "Unit administration requires organization admin scope.",
    llmContext: "ADMIN"
  }),
  "/app/admin/users": contract({
    route: "/app/admin/users",
    label: "Users",
    allowedRoles: adminRoles,
    requiredPermissions: ["user:manage"],
    requiredScope: "ORG",
    visibleActions: ["suspend_user", "reactivate_user"],
    hiddenActions: ["delete_user_without_review"],
    emptyState: "No users are configured.",
    forbiddenState: "User administration requires organization admin scope.",
    llmContext: "ADMIN"
  })
};

export function routeAllowedForRole(route: AppRoute, role: AccountRole) {
  return pageContracts[route].allowedRoles.includes(role);
}

export function assertPageContractsComplete() {
  for (const route of appRoutes) {
    const item = pageContracts[route];
    if (!item || item.route !== route) {
      throw new Error(`Missing page contract for ${route}`);
    }
    if (!item.emptyState || !item.forbiddenState) {
      throw new Error(`Missing state copy for ${route}`);
    }
  }
  return true;
}

assertPageContractsComplete();
