import assert from "node:assert/strict";

import {
  assertLlmRuntimeRegistry,
  llmRuntimeTools,
  llmRuntimeToolRegistry
} from "./llm-tool-runtime";

assert.equal(assertLlmRuntimeRegistry(), true);
assert.equal(
  new Set(llmRuntimeTools.map((tool) => tool.name)).size,
  llmRuntimeTools.length
);
for (const tool of llmRuntimeTools) {
  assert.equal(llmRuntimeToolRegistry.get(tool.name)?.name, tool.name);
}

console.log("LLM runtime registry assertions passed");
