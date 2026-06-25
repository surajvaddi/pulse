import assert from "node:assert/strict";

import {
  LlmGatewayFactory,
  MockLlmGateway,
  OpenAICompatibleGateway
} from "./index.js";

assert.ok(LlmGatewayFactory.fromEnvironment({}) instanceof MockLlmGateway);
assert.ok(
  LlmGatewayFactory.fromEnvironment({ LLM_PROVIDER: "mock" }) instanceof
    MockLlmGateway
);
assert.ok(
  LlmGatewayFactory.fromEnvironment({
    LLM_PROVIDER: "openai-compatible",
    LLM_PROVIDER_ENABLED: "false"
  }) instanceof OpenAICompatibleGateway
);
assert.throws(
  () => LlmGatewayFactory.fromEnvironment({ LLM_PROVIDER: "unknown" }),
  /Unsupported/
);

console.log("LLM gateway factory assertions passed");
