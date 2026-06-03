import { AccountRoleSchema, type AccountRole, type Permission, type Scope } from "@pulseshift/domain";

export type ProductionPageId =
  | "home"
  | "schedule"
  | "swaps"
  | "timecards"
  | "staffing"
  | "staff"
  | "manager"
  | "admin_audit"
  | "admin_integrations"
  | "admin_evals"
  | "admin_users"
  | "admin_facilities"
  | "admin_units"
  | "admin_roles"
  | "admin_invitations";

export type RolePageInteraction = {
  requiredPermissions: Permission[];
  scope: Scope["type"];
  readLevel: "NONE" | "SELF" | "UNIT" | "FACILITY" | "ORG";
  writeLevel: "NONE" | "SELF" | "UNIT" | "FACILITY" | "ORG";
  visibleActions: string[];
  hiddenActions: string[];
  forbiddenState: string;
  emptyState: string;
  auditEvents: string[];
};

export const productionRoles = AccountRoleSchema.options;

export const productionPages: ProductionPageId[] = [
  "home",
  "schedule",
  "swaps",
  "timecards",
  "staffing",
  "staff",
  "manager",
  "admin_audit",
  "admin_integrations",
  "admin_evals",
  "admin_users",
  "admin_facilities",
  "admin_units",
  "admin_roles",
  "admin_invitations"
];

const forbidden: RolePageInteraction = {
  requiredPermissions: [],
  scope: "ORG",
  readLevel: "NONE",
  writeLevel: "NONE",
  visibleActions: [],
  hiddenActions: ["all_mutations"],
  forbiddenState: "This role cannot access this page.",
  emptyState: "No records are visible for this role.",
  auditEvents: []
};

function allow(input: Partial<RolePageInteraction> & Pick<RolePageInteraction, "requiredPermissions" | "readLevel">): RolePageInteraction {
  return {
    scope: "ORG",
    writeLevel: "NONE",
    visibleActions: [],
    hiddenActions: [],
    forbiddenState: "Access requires additional permissions.",
    emptyState: "No records match the current scope.",
    auditEvents: [],
    ...input
  };
}

const employeePages: Partial<Record<ProductionPageId, RolePageInteraction>> = {
  home: allow({ requiredPermissions: ["schedule:read:self"], scope: "SELF", readLevel: "SELF" }),
  schedule: allow({ requiredPermissions: ["schedule:read:self"], scope: "SELF", readLevel: "SELF" }),
  swaps: allow({
    requiredPermissions: ["shift:swap:create"],
    scope: "SELF",
    readLevel: "SELF",
    writeLevel: "SELF",
    visibleActions: ["create_swap", "accept_swap", "decline_swap"],
    hiddenActions: ["approve_swap", "assign_shift"],
    auditEvents: ["swap.created", "swap.counterparty_accepted", "swap.counterparty_declined"]
  }),
  timecards: allow({
    requiredPermissions: ["timecard:read:self"],
    scope: "SELF",
    readLevel: "SELF",
    writeLevel: "SELF",
    visibleActions: ["clock_in", "clock_out"],
    hiddenActions: ["resolve_exception", "edit_payroll"],
    auditEvents: ["timecard.clock_in", "timecard.clock_out"]
  }),
  staff: allow({ requiredPermissions: ["schedule:read:self"], scope: "SELF", readLevel: "SELF" })
};

const unitManagerPages: Partial<Record<ProductionPageId, RolePageInteraction>> = {
  home: allow({ requiredPermissions: ["schedule:read:unit"], scope: "UNIT", readLevel: "UNIT" }),
  schedule: allow({
    requiredPermissions: ["schedule:read:unit"],
    scope: "UNIT",
    readLevel: "UNIT",
    writeLevel: "UNIT",
    visibleActions: ["assign_shift", "approve_swap"],
    hiddenActions: ["manage_users", "export_payroll"],
    auditEvents: ["swap.manager_approved", "swap.manager_denied"]
  }),
  swaps: allow({
    requiredPermissions: ["shift:swap:approve"],
    scope: "UNIT",
    readLevel: "UNIT",
    writeLevel: "UNIT",
    visibleActions: ["approve_swap", "deny_swap"],
    auditEvents: ["swap.manager_approved", "swap.manager_denied"]
  }),
  timecards: allow({ requiredPermissions: ["timecard:read:unit"], scope: "UNIT", readLevel: "UNIT" }),
  staffing: allow({ requiredPermissions: ["schedule:read:unit"], scope: "UNIT", readLevel: "UNIT" }),
  staff: allow({ requiredPermissions: ["schedule:read:unit"], scope: "UNIT", readLevel: "UNIT" }),
  manager: allow({ requiredPermissions: ["schedule:read:unit"], scope: "UNIT", readLevel: "UNIT" })
};

const payrollPages: Partial<Record<ProductionPageId, RolePageInteraction>> = {
  home: allow({ requiredPermissions: ["timecard:read:unit"], scope: "UNIT", readLevel: "UNIT" }),
  timecards: allow({
    requiredPermissions: ["timecard:read:unit"],
    scope: "UNIT",
    readLevel: "UNIT",
    writeLevel: "UNIT",
    visibleActions: ["resolve_exception", "export_payroll"],
    hiddenActions: ["assign_shift", "approve_swap"],
    auditEvents: ["timecard.exception_resolved", "payroll.export"]
  })
};

const adminPages: Partial<Record<ProductionPageId, RolePageInteraction>> = Object.fromEntries(
  productionPages.map((page) => [
    page,
    allow({
      requiredPermissions: page.startsWith("admin_integrations")
        ? ["integration:manage"]
        : page.startsWith("admin_audit") || page.startsWith("admin_evals")
          ? ["audit:read"]
          : ["user:manage"],
      scope: "ORG",
      readLevel: "ORG",
      writeLevel: page === "admin_audit" || page === "admin_evals" ? "NONE" : "ORG",
      visibleActions: page === "admin_audit" ? ["review_audit"] : ["create", "update", "deactivate"],
      hiddenActions: ["cross_org_access", "raw_permission_entry"],
      auditEvents: ["admin.mutation"]
    })
  ])
) as Partial<Record<ProductionPageId, RolePageInteraction>>;

function roleTemplate(role: AccountRole) {
  if (role === "EMPLOYEE" || role === "EXTERNAL_AGENCY_ADMIN") {
    return employeePages;
  }
  if (role === "UNIT_MANAGER" || role === "CHARGE_NURSE" || role === "FLOAT_POOL_COORDINATOR") {
    return unitManagerPages;
  }
  if (role === "PAYROLL_ADMIN") {
    return payrollPages;
  }
  if (
    role === "ORGANIZATION_OWNER" ||
    role === "SYSTEM_ADMIN" ||
    role === "WORKFORCE_ADMIN" ||
    role === "CREDENTIALING_ADMIN" ||
    role === "COMPLIANCE_AUDITOR" ||
    role === "EXECUTIVE_VIEWER" ||
    role === "AI_AGENT_SERVICE"
  ) {
    return adminPages;
  }
  return {};
}

export const rolePageMatrix = Object.fromEntries(
  productionRoles.map((role) => {
    const template = roleTemplate(role);
    return [
      role,
      Object.fromEntries(
        productionPages.map((page) => [
          page,
          template[page] ?? forbidden
        ])
      )
    ];
  })
) as Record<AccountRole, Record<ProductionPageId, RolePageInteraction>>;

export function assertRolePageMatrixComplete() {
  for (const role of productionRoles) {
    const pages = rolePageMatrix[role];
    for (const page of productionPages) {
      const interaction = pages[page];
      if (!interaction) {
        throw new Error(`Missing role/page matrix entry: ${role}.${page}`);
      }
      if (!interaction.forbiddenState || !interaction.emptyState) {
        throw new Error(`Missing role/page states: ${role}.${page}`);
      }
    }
  }
  return true;
}
