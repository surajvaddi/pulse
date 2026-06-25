import assert from "node:assert/strict";
import {
  assertPromptRoutingCoverage,
  promptRoutingCases
} from "@pulseshift/evals";

import { llmRuntimeTools } from "./llm-tool-runtime";

assert.equal(
  assertPromptRoutingCoverage(llmRuntimeTools.map((tool) => tool.name)),
  true
);
assert.equal(promptRoutingCases.length, llmRuntimeTools.length);
for (const item of promptRoutingCases) {
  assert.equal(item.paraphrases.length, 3);
  assert.ok(item.ambiguousPrompt);
  assert.ok(item.wrongRolePrompt);
  assert.ok(item.crossScopePrompt);
  assert.ok(item.adversarialPrompt);
  assert.ok(item.noToolPrompt);
}

console.log("prompt routing coverage assertions passed");
