import assert from "node:assert/strict";

import {
  LlmAccountRoleSchema,
  MockLlmGateway,
  OpenAICompatibleGateway,
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

const disabledProvider = new OpenAICompatibleGateway({
  baseUrl: "https://llm.example.test/v1",
  model: "test-model",
  timeoutMs: 100,
  maxRetries: 0,
  enabled: false
});

const disabledResponse = await disabledProvider.complete({
  route: "SELF_SERVICE_CHAT",
  messages: [{ role: "user", content: "hello" }],
  roleContext: employeeContext,
  availableTools: []
});

assert.equal(disabledResponse.finishReason, "error");
assert.equal(disabledResponse.error?.code, "DISABLED");
assert.equal(disabledProvider.redactedConfig().apiKey, undefined);

const successfulProvider = new OpenAICompatibleGateway(
  {
    baseUrl: "https://llm.example.test/v1",
    apiKey: "secret-key",
    model: "test-model",
    timeoutMs: 100,
    maxRetries: 0,
    enabled: true
  },
  async () =>
    new Response(
      JSON.stringify({
        model: "test-model",
        choices: [{ message: { content: "Provider answer" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    )
);

const providerResponse = await successfulProvider.complete({
  route: "SELF_SERVICE_CHAT",
  messages: [{ role: "user", content: "hello" }],
  roleContext: employeeContext,
  availableTools: []
});

assert.equal(providerResponse.provider, "openai-compatible");
assert.equal(providerResponse.content, "Provider answer");
assert.equal(providerResponse.usage.totalTokens, 5);
assert.equal(successfulProvider.redactedConfig().apiKey, "[REDACTED]");

const rateLimitedProvider = new OpenAICompatibleGateway(
  {
    baseUrl: "https://llm.example.test/v1",
    apiKey: "secret-key",
    model: "test-model",
    timeoutMs: 100,
    maxRetries: 0,
    enabled: true
  },
  async () => new Response("rate limited", { status: 429 })
);

const rateLimited = await rateLimitedProvider.complete({
  route: "SAFETY_REVIEW",
  messages: [{ role: "user", content: "hello" }],
  roleContext: employeeContext,
  availableTools: []
});

assert.equal(rateLimited.error?.code, "RATE_LIMIT");
assert.equal(rateLimited.error?.retryable, true);
