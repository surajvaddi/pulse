import assert from "node:assert/strict";

import {
  AccountRoleSchema,
  InvitationWorkforceAssignmentSchema,
  onboardingRequirementsForRole,
  onboardingRouteAfterStructure,
  scopeForInvitation,
  type AccountRole
} from "./index.js";

const expectedProfileRequirement: Record<AccountRole, boolean> = {
  ORGANIZATION_OWNER: false,
  SYSTEM_ADMIN: false,
  WORKFORCE_ADMIN: false,
  UNIT_MANAGER: true,
  CHARGE_NURSE: true,
  EMPLOYEE: true,
  FLOAT_POOL_COORDINATOR: false,
  PAYROLL_ADMIN: false,
  CREDENTIALING_ADMIN: false,
  COMPLIANCE_AUDITOR: false,
  EXECUTIVE_VIEWER: false,
  EXTERNAL_AGENCY_ADMIN: false,
  AI_AGENT_SERVICE: false
};

for (const role of AccountRoleSchema.options) {
  const requirements = onboardingRequirementsForRole(role);
  assert.equal(
    requirements.requiresEmployeeProfile,
    expectedProfileRequirement[role],
    `${role} employee-profile requirement`
  );
  assert.equal(
    requirements.requiresNotificationPreferences,
    role !== "AI_AGENT_SERVICE",
    `${role} notification-preferences requirement`
  );
  assert.equal(
    requirements.requiresIntegrations,
    role === "ORGANIZATION_OWNER" || role === "SYSTEM_ADMIN",
    `${role} integrations requirement`
  );
}

assert.equal(onboardingRouteAfterStructure("ORGANIZATION_OWNER"), "/onboarding/preferences");
assert.equal(onboardingRouteAfterStructure("EMPLOYEE"), "/onboarding/profile");

assert.equal(
  InvitationWorkforceAssignmentSchema.parse({
    facilityId: "fac_1",
    unitId: "unit_1",
    workforceRoleId: "role_rn",
    employmentType: "FULL_TIME",
    employeeNumberPolicy: "ASSIGNED",
    employeeNumber: "RN-100"
  }).employeeNumber,
  "RN-100"
);
assert.throws(() =>
  InvitationWorkforceAssignmentSchema.parse({
    facilityId: "fac_1",
    unitId: "unit_1",
    workforceRoleId: "role_rn",
    employmentType: "FULL_TIME",
    employeeNumberPolicy: "ASSIGNED"
  })
);

assert.deepEqual(
  scopeForInvitation("EMPLOYEE", { organizationId: "org_1" }),
  { type: "SELF" }
);
assert.deepEqual(
  scopeForInvitation("UNIT_MANAGER", {
    organizationId: "org_1",
    unitIds: ["unit_1", "unit_1"]
  }),
  { type: "UNIT", unitIds: ["unit_1"] }
);
assert.deepEqual(
  scopeForInvitation("WORKFORCE_ADMIN", {
    organizationId: "org_1",
    facilityIds: ["fac_1"]
  }),
  { type: "FACILITY", facilityIds: ["fac_1"] }
);
assert.deepEqual(
  scopeForInvitation("PAYROLL_ADMIN", { organizationId: "org_1" }),
  { type: "ORG", organizationId: "org_1" }
);
assert.throws(() =>
  scopeForInvitation("UNIT_MANAGER", { organizationId: "org_1" })
);
assert.throws(() =>
  scopeForInvitation("EXTERNAL_AGENCY_ADMIN", { organizationId: "org_1" })
);

const invitationSelectionsByRole: Record<
  AccountRole,
  { facilityIds?: string[]; unitIds?: string[] } | "BLOCKED"
> = {
  ORGANIZATION_OWNER: {},
  SYSTEM_ADMIN: {},
  WORKFORCE_ADMIN: { facilityIds: ["fac_1"] },
  UNIT_MANAGER: { unitIds: ["unit_1"] },
  CHARGE_NURSE: { unitIds: ["unit_1"] },
  EMPLOYEE: {},
  FLOAT_POOL_COORDINATOR: { facilityIds: ["fac_1"] },
  PAYROLL_ADMIN: {},
  CREDENTIALING_ADMIN: {},
  COMPLIANCE_AUDITOR: {},
  EXECUTIVE_VIEWER: {},
  EXTERNAL_AGENCY_ADMIN: "BLOCKED",
  AI_AGENT_SERVICE: "BLOCKED"
};

for (const role of AccountRoleSchema.options) {
  const selection = invitationSelectionsByRole[role];
  if (selection === "BLOCKED") {
    assert.throws(() =>
      scopeForInvitation(role, { organizationId: "org_1" })
    );
  } else {
    assert.doesNotThrow(() =>
      scopeForInvitation(role, { organizationId: "org_1", ...selection })
    );
  }
}
