import assert from "node:assert/strict";

import {
  LlmAccountRoleSchema,
  MockLlmGateway,
  assertRoleContextComplete,
  normalizeProviderError,
  serializeRoleContext,
  type LlmRoleContext
} from "./index.js";

const roleContexts: LlmRoleContext[] = LlmAccountRoleSchema.options.map((role) => ({
  actorUserId: `user_${role.toLowerCase()}`,
  organizationId: "org_pulseshift_demo",
  role,
  permissions: ["ai:use"],
  scopes: [{ type: "ORG", organizationId: "org_pulseshift_demo" }],
  currentPage: "/app/copilot",
  mode: "DEMO"
}));

assert.equal(assertRoleContextComplete(roleContexts, LlmAccountRoleSchema.options), true);

const firstRoleContext = roleContexts[0];
assert.ok(firstRoleContext);
const serialized = serializeRoleContext(firstRoleContext);
assert.deepEqual(serialized.permissions, ["ai:use"]);
assert.equal(serialized.currentPage, "/app/copilot");

const normalized = normalizeProviderError({
  code: "TIMEOUT",
  message: "Provider timed out",
  statusCode: 504
});
assert.equal(normalized.code, "TIMEOUT");
assert.equal(normalized.retryable, true);
assert.equal(normalized.statusCode, 504);

const gateway = new MockLlmGateway({ content: "hello" });
const employeeContext = roleContexts.find((context) => context.role === "EMPLOYEE");
assert.ok(employeeContext);
const response = await gateway.complete({
  route: "SELF_SERVICE_CHAT",
  messages: [{ role: "user", content: "When do I work next?" }],
  roleContext: employeeContext,
  availableTools: ["get_my_schedule"]
});

assert.equal(response.provider, "mock");
assert.equal(response.content, "hello");
assert.equal(response.route, "SELF_SERVICE_CHAT");
