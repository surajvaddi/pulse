import assert from "node:assert/strict";
import {
  RolePermissionMap,
  onboardingRequirementsForRole,
  scopeForInvitation
} from "@pulseshift/domain";

const requirements = onboardingRequirementsForRole("ORGANIZATION_OWNER");
assert.equal(requirements.requiresEmployeeProfile, false);
assert.equal(requirements.requiresIntegrations, true);

assert.deepEqual(
  scopeForInvitation("UNIT_MANAGER", {
    organizationId: "org_1",
    unitIds: ["unit_1"]
  }),
  { type: "UNIT", unitIds: ["unit_1"] }
);
assert.deepEqual(
  scopeForInvitation("EMPLOYEE", { organizationId: "org_1" }),
  { type: "SELF" }
);
for (const permission of [
  "user:manage",
  "schedule:write:draft",
  "schedule:publish",
  "shift:assign",
  "integration:manage"
] as const) {
  assert.ok(RolePermissionMap.ORGANIZATION_OWNER.includes(permission));
}

console.log("owner journey acceptance assertions passed");
