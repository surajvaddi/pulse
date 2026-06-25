import assert from "node:assert/strict";

import {
  assertLlmRuntimeRegistry,
  llmRuntimeTools,
  llmRuntimeToolRegistry,
  normalizeToolProposal
} from "./llm-tool-runtime";

assert.equal(assertLlmRuntimeRegistry(), true);
assert.equal(
  new Set(llmRuntimeTools.map((tool) => tool.name)).size,
  llmRuntimeTools.length
);
for (const tool of llmRuntimeTools) {
  assert.equal(llmRuntimeToolRegistry.get(tool.name)?.name, tool.name);
}
const normalized = normalizeToolProposal({
  toolName: "claim_shift_slot",
  argumentsJson: { slotId: "slot_1" },
  riskLevel: "READ_ONLY",
  requiresApproval: false
});
assert.equal(normalized.riskLevel, "LOW_RISK_WRITE");
assert.equal(normalized.requiresApproval, true);
assert.throws(
  () =>
    normalizeToolProposal({
      toolName: "unknown_tool",
      argumentsJson: {},
      riskLevel: "READ_ONLY",
      requiresApproval: false
    }),
  /Unknown/
);
assert.throws(
  () =>
    normalizeToolProposal({
      toolName: "claim_shift_slot",
      argumentsJson: {},
      riskLevel: "READ_ONLY",
      requiresApproval: false
    }),
  /Invalid/
);
assert.throws(
  () =>
    normalizeToolProposal({
      toolName: "get_my_schedule",
      argumentsJson: {},
      riskLevel: "READ_ONLY",
      requiresApproval: false,
      argumentParseError: true
    }),
  /Malformed/
);

console.log("LLM runtime registry assertions passed");
