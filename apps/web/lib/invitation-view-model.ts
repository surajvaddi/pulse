import {
  AccountRoleSchema,
  onboardingRequirementsForRole,
  type AccountRole
} from "@pulseshift/domain";

export type InvitationScopeControl = "SELF" | "UNIT" | "FACILITY" | "ORG";

export function invitationRoleViewModel(roleInput: string): {
  role: AccountRole;
  scopeControl: InvitationScopeControl;
  requiresWorkforcePlacement: boolean;
} {
  const role = AccountRoleSchema.parse(roleInput);
  const scopeControl: InvitationScopeControl =
    role === "EMPLOYEE"
      ? "SELF"
      : role === "UNIT_MANAGER" || role === "CHARGE_NURSE"
        ? "UNIT"
        : role === "WORKFORCE_ADMIN" || role === "FLOAT_POOL_COORDINATOR"
          ? "FACILITY"
          : "ORG";
  return {
    role,
    scopeControl,
    requiresWorkforcePlacement:
      onboardingRequirementsForRole(role).requiresEmployeeProfile
  };
}

export function invitationScopeLabel(input: {
  scopeControl: InvitationScopeControl;
  facilityName?: string;
  unitName?: string;
}) {
  switch (input.scopeControl) {
    case "SELF":
      return "Self service only";
    case "UNIT":
      return `Unit: ${input.unitName ?? "select a unit"}`;
    case "FACILITY":
      return `Facility: ${input.facilityName ?? "select a facility"}`;
    case "ORG":
      return "Entire organization";
  }
}
