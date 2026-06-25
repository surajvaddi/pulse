import assert from "node:assert/strict";

import { demoSessions } from "../auth/demo-users";
import { llmRuntimeToolRegistry } from "./llm-tool-runtime";

const requester = demoSessions.find((session) => session.role === "EMPLOYEE");
const manager = demoSessions.find((session) => session.role === "UNIT_MANAGER");
const aiAgent = demoSessions.find((session) => session.role === "AI_AGENT_SERVICE");
assert.ok(requester);
assert.ok(manager);
assert.ok(aiAgent);

for (const name of [
  "create_shift_swap_request",
  "claim_shift_slot",
  "decide_shift_claim",
  "decide_shift_swap",
  "publish_shift_slots"
]) {
  const tool = llmRuntimeToolRegistry.get(name);
  assert.ok(tool?.requiresPreview);
  assert.ok(tool?.requiresPolicyGate);
  assert.equal(tool?.roleAccess.AI_AGENT_SERVICE, "BLOCKED");
}
assert.equal(
  llmRuntimeToolRegistry.get("claim_shift_slot")?.roleAccess[requester.role],
  "APPROVAL_REQUIRED"
);
assert.equal(
  llmRuntimeToolRegistry.get("decide_shift_claim")?.roleAccess[manager.role],
  "APPROVAL_REQUIRED"
);

console.log("Copilot approval routing assertions passed");
