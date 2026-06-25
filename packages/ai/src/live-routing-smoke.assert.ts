import assert from "node:assert/strict";

import {
  LlmGatewayFactory,
  type LlmProviderToolDefinition,
  type LlmRoleContext
} from "./index.js";

if (process.env.LLM_LIVE_SMOKE !== "true") {
  console.log("live routing smoke skipped; set LLM_LIVE_SMOKE=true to enable");
} else {
  const gateway = LlmGatewayFactory.fromEnvironment(process.env);
  const roleContext: LlmRoleContext = {
    actorUserId: "live_smoke_actor",
    organizationId: "live_smoke_org",
    role: "EMPLOYEE",
    permissions: ["schedule:read:self", "timecard:read:self"],
    scopes: [{ type: "SELF" }],
    currentPage: "/app/copilot",
    mode: "PRODUCTION"
  };
  const tools: LlmProviderToolDefinition[] = [
    {
      name: "get_my_schedule",
      description: "Read the current user's schedule.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: "get_timecard_exceptions",
      description: "Read the current user's timecard exceptions.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    }
  ];
  const prompts = [
    { prompt: "When do I work next?", expected: "get_my_schedule" },
    {
      prompt: "Show my timecard exceptions.",
      expected: "get_timecard_exceptions"
    }
  ];
  const results = [];
  for (const item of prompts) {
    const response = await gateway.complete({
      route: "SELF_SERVICE_CHAT",
      messages: [{ role: "user", content: item.prompt }],
      roleContext,
      availableTools: tools
    });
    const proposed = response.toolProposals[0]?.toolName;
    results.push({
      prompt: item.prompt,
      expected: item.expected,
      proposed,
      model: response.model,
      latencyMs: response.latencyMs,
      usage: response.usage,
      passed: proposed === item.expected
    });
  }
  console.log(JSON.stringify(results, null, 2));
  assert.ok(results.every((result) => result.passed));
}
