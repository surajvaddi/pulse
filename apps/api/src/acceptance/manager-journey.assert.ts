import assert from "node:assert/strict";
import {
  RolePermissionMap,
  onboardingRequirementsForRole,
  scopeForInvitation
} from "@pulseshift/domain";

import { resolveWorkspaceScope } from "../auth/workspace-context.service";
import { llmRuntimeToolRegistry } from "../workflows/llm-tool-runtime";

assert.equal(
  onboardingRequirementsForRole("UNIT_MANAGER").requiresEmployeeProfile,
  true
);
assert.deepEqual(
  scopeForInvitation("UNIT_MANAGER", {
    organizationId: "org_1",
    unitIds: ["unit_a"]
  }),
  { type: "UNIT", unitIds: ["unit_a"] }
);
const context = resolveWorkspaceScope({
  organizationId: "org_1",
  scopes: [{ type: "UNIT", unitIds: ["unit_a"] }],
  facilities: [
    { id: "fac_a", name: "A" },
    { id: "fac_b", name: "B" }
  ],
  units: [
    { id: "unit_a", name: "A", facilityId: "fac_a" },
    { id: "unit_b", name: "B", facilityId: "fac_b" }
  ],
  employeeProfile: {
    primaryFacilityId: "fac_a",
    primaryUnitId: "unit_a"
  }
});
assert.deepEqual(context.units.map((unit) => unit.id), ["unit_a"]);
for (const permission of [
  "schedule:read:unit",
  "shift:assign",
  "shift:swap:approve",
  "timecard:read:unit"
] as const) {
  assert.ok(RolePermissionMap.UNIT_MANAGER.includes(permission));
}
for (const toolName of [
  "compute_staffing_gaps",
  "list_shift_pipeline_slots",
  "direct_assign_shift_slot",
  "decide_shift_claim",
  "decide_shift_swap"
]) {
  assert.notEqual(
    llmRuntimeToolRegistry.get(toolName)?.roleAccess.UNIT_MANAGER,
    "BLOCKED"
  );
}

console.log("manager journey acceptance assertions passed");
