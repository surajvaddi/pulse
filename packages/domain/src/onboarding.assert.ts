import assert from "node:assert/strict";

import {
  AccountRoleSchema,
  InvitationWorkforceAssignmentSchema,
  onboardingRequirementsForRole,
  onboardingRouteAfterStructure,
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
