import assert from "node:assert/strict";
import {
  RolePermissionMap,
  onboardingRequirementsForRole,
  scopeForInvitation
} from "@pulseshift/domain";

import { llmRuntimeToolRegistry } from "../workflows/llm-tool-runtime";

const requirements = onboardingRequirementsForRole("EMPLOYEE");
assert.equal(requirements.requiresEmployeeProfile, true);
assert.equal(requirements.requiresNotificationPreferences, true);
assert.deepEqual(
  scopeForInvitation("EMPLOYEE", { organizationId: "org_1" }),
  { type: "SELF" }
);
for (const permission of [
  "schedule:read:self",
  "shift:claim",
  "shift:swap:create",
  "timecard:read:self",
  "timecard:write:self"
] as const) {
  assert.ok(RolePermissionMap.EMPLOYEE.includes(permission));
}
for (const toolName of [
  "get_my_schedule",
  "list_swappable_shifts",
  "list_shift_swap_candidates",
  "create_shift_swap_request",
  "claim_shift_slot",
  "get_timecard_exceptions"
]) {
  assert.notEqual(
    llmRuntimeToolRegistry.get(toolName)?.roleAccess.EMPLOYEE,
    "BLOCKED"
  );
}
assert.equal(
  llmRuntimeToolRegistry.get("direct_assign_shift_slot")?.roleAccess.EMPLOYEE,
  "BLOCKED"
);
assert.equal(
  llmRuntimeToolRegistry.get("decide_shift_swap")?.roleAccess.EMPLOYEE,
  "BLOCKED"
);

console.log("employee journey acceptance assertions passed");
