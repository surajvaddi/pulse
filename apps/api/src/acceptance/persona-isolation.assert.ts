import assert from "node:assert/strict";

import { demoSessions, type DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { llmRuntimeTools } from "../workflows/llm-tool-runtime";

const permissions = new PermissionService();
const employee = demoSessions.find((session) => session.role === "EMPLOYEE");
const manager = demoSessions.find((session) => session.role === "UNIT_MANAGER");
const workforce = demoSessions.find(
  (session) => session.role === "WORKFORCE_ADMIN"
);
const owner = demoSessions.find(
  (session) => session.role === "ORGANIZATION_OWNER"
);
const aiAgent = demoSessions.find(
  (session) => session.role === "AI_AGENT_SERVICE"
);
assert.ok(employee);
assert.ok(manager);
assert.ok(workforce);
assert.ok(owner);
assert.ok(aiAgent);

assert.equal(
  permissions.hasPermission(employee, "schedule:read:self", {
    type: "SELF",
    userId: employee.userId
  }),
  true
);
assert.equal(
  permissions.hasPermission(employee, "schedule:read:self", {
    type: "SELF",
    userId: "another_user"
  }),
  false
);
assert.equal(
  permissions.hasPermission(manager, "schedule:read:unit", {
    type: "UNIT",
    unitId: "unit_icu"
  }),
  true
);
assert.equal(
  permissions.hasPermission(manager, "schedule:read:unit", {
    type: "UNIT",
    unitId: "unit_other"
  }),
  false
);
assert.equal(
  permissions.hasPermission(workforce, "schedule:read:facility", {
    type: "FACILITY",
    facilityId: "fac_mercy_main"
  }),
  true
);
assert.equal(
  permissions.hasPermission(workforce, "schedule:read:facility", {
    type: "FACILITY",
    facilityId: "fac_other"
  }),
  false
);
const wrongOrganization: DemoSession = {
  ...owner,
  organizationId: "org_other"
};
assert.equal(
  permissions.hasPermission(wrongOrganization, "audit:read", {
    type: "ORG",
    organizationId: "org_pulseshift_demo"
  }),
  false
);

for (const tool of llmRuntimeTools.filter((candidate) => candidate.allowsMutation)) {
  assert.equal(tool.roleAccess.AI_AGENT_SERVICE, "BLOCKED", tool.name);
}
assert.equal(
  llmRuntimeTools.find((tool) => tool.name === "direct_assign_shift_slot")
    ?.roleAccess.EMPLOYEE,
  "BLOCKED"
);

console.log("persona isolation assertions passed");
