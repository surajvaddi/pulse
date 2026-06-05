import assert from "node:assert/strict";

import { OpenAICompatibleGateway, type LlmRoleContext } from "./index.js";

const liveSmokeEnabled = process.env.LLM_LIVE_SMOKE === "true";

if (!liveSmokeEnabled) {
  console.log("Skipping live LLM smoke test. Set LLM_LIVE_SMOKE=true to run it.");
} else {
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY;
  assert.ok(apiKey, "Set AI_GATEWAY_API_KEY or OPENAI_API_KEY before running the live LLM smoke test.");

  const gateway = new OpenAICompatibleGateway({
    baseUrl: process.env.AI_GATEWAY_BASE_URL || "https://api.openai.com/v1",
    apiKey,
    model: process.env.LLM_MODEL || "gpt-4.1-mini",
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 8000),
    maxRetries: 0,
    enabled: true
  });

  const roleContext: LlmRoleContext = {
    actorUserId: "smoke_user_employee",
    organizationId: "smoke_org",
    role: "EMPLOYEE",
    permissions: ["ai:use", "schedule:read:self"],
    scopes: [{ type: "SELF" }],
    currentPage: "/app/copilot",
    mode: "PRODUCTION"
  };

  const response = await gateway.complete({
    route: "SELF_SERVICE_CHAT",
    messages: [
      {
        role: "user",
        content: "Reply with one short sentence confirming the scheduling copilot is reachable."
      }
    ],
    roleContext,
    availableTools: []
  });

  assert.equal(response.provider, "openai-compatible");
  assert.equal(response.route, "SELF_SERVICE_CHAT");
  assert.notEqual(response.finishReason, "error", response.error?.message);
  assert.ok(response.content.trim().length > 0, "Live provider returned an empty response.");
  assert.ok(response.latencyMs >= 0, "Live provider latency metadata is missing.");
  assert.ok(response.usage.totalTokens >= 0, "Live provider usage metadata is missing.");
  assert.equal(gateway.redactedConfig().apiKey, "[REDACTED]");
}
