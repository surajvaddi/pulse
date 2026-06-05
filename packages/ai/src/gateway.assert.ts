import assert from "node:assert/strict";

import {
  LlmAccountRoleSchema,
  LlmModelRouter,
  LlmToolRegistry,
  MockLlmGateway,
  OpenAICompatibleGateway,
  assertRoleContextComplete,
  normalizeProviderError,
  serializeRoleContext,
  parseLlmRouteOverrides,
  roleAccessFor,
  type LlmRoleContext
} from "./index.js";
import { z } from "zod";

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

const router = new LlmModelRouter({
  MANAGER_OPERATIONS: {
    provider: "openai-compatible",
    model: "manager-model",
    enabled: true,
    budget: { maxEstimatedCostUsd: 0.04 }
  },
  WORKFLOW_PREVIEW: {
    enabled: false
  }
});

assert.equal(router.route("MANAGER_OPERATIONS").model, "manager-model");
assert.equal(router.route("MANAGER_OPERATIONS").budget.maxEstimatedCostUsd, 0.04);
assert.equal(router.route("WORKFLOW_PREVIEW").route, "SAFETY_REVIEW");
assert.equal(router.allRoutes().length, 6);

const overrides = parseLlmRouteOverrides({
  LLM_PROVIDER: "openai-compatible",
  LLM_PROVIDER_ENABLED: "true",
  LLM_MODEL: "global-model",
  LLM_MODEL_EVAL_RUN: "eval-model",
  LLM_TIMEOUT_MS: "1234"
});
const envRouter = new LlmModelRouter(overrides);
assert.equal(envRouter.route("SELF_SERVICE_CHAT").provider, "openai-compatible");
assert.equal(envRouter.route("EVAL_RUN").model, "eval-model");
assert.equal(envRouter.route("SQL_REPORT_SUMMARY").timeoutMs, 1234);

const readTool = {
  name: "get_my_schedule",
  description: "Read self-scoped schedule rows.",
  routeAvailability: ["SELF_SERVICE_CHAT" as const],
  pageContexts: ["*", "/app/schedule"],
  inputSchema: z.object({ userId: z.string() }),
  outputSchema: z.object({ shiftIds: z.array(z.string()) }),
  riskLevel: "READ_ONLY" as const,
  scopeRequirement: "SELF" as const,
  roleAccess: roleAccessFor({ EMPLOYEE: "ALLOWED", SYSTEM_ADMIN: "READ_ONLY" }),
  auditEvent: "llm.tool.get_my_schedule",
  usesSqlReport: false
};

const registry = new LlmToolRegistry([readTool]);
assert.equal(registry.assertSafe(), true);
assert.equal(registry.availableFor({ role: "EMPLOYEE", currentPage: "/app/schedule" }, "SELF_SERVICE_CHAT").length, 1);
assert.equal(registry.availableFor({ role: "PAYROLL_ADMIN", currentPage: "/app/schedule" }, "SELF_SERVICE_CHAT").length, 0);

assert.throws(
  () =>
    new LlmToolRegistry([
      {
        ...readTool,
        name: "run_raw_sql_query"
      }
    ]).assertSafe(),
  /Unsafe/
);

assert.throws(
  () =>
    new LlmToolRegistry([
      {
        ...readTool,
        name: "assign_shift",
        riskLevel: "LOW_RISK_WRITE",
        allowsMutation: true,
        requiresPreview: true,
        requiresPolicyGate: false
      }
    ]).assertSafe(),
  /policy and preview/
);
