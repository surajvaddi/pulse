import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  invitationRoleViewModel,
  invitationScopeLabel
} from "./invitation-view-model";

assert.deepEqual(invitationRoleViewModel("EMPLOYEE"), {
  role: "EMPLOYEE",
  scopeControl: "SELF",
  requiresWorkforcePlacement: true
});
assert.equal(invitationRoleViewModel("UNIT_MANAGER").scopeControl, "UNIT");
assert.equal(
  invitationRoleViewModel("WORKFORCE_ADMIN").scopeControl,
  "FACILITY"
);
assert.equal(invitationRoleViewModel("ORGANIZATION_OWNER").scopeControl, "ORG");
assert.equal(
  invitationScopeLabel({ scopeControl: "UNIT", unitName: "Emergency" }),
  "Unit: Emergency"
);

const actions = readFileSync("app/account-actions.ts", "utf8");
assert.ok(actions.includes("workforceAssignment"));
assert.ok(actions.includes("facilityIds: [facilityId]"));
assert.ok(actions.includes("unitIds: [unitId]"));
