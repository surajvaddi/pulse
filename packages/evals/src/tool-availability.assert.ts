import assert from "node:assert/strict";

import { scoreCopilotEvalTask, type CopilotEvalTask } from "./index.js";

const task: CopilotEvalTask = {
  id: "availability",
  title: "Expected tool is offered",
  actorUserId: "user_1",
  actorRole: "EMPLOYEE",
  prompt: "Show my schedule",
  expectedMode: "ANSWER",
  expectedTools: ["get_my_schedule"],
  forbiddenTools: [],
  requiredAnswerSignals: []
};
const base = {
  mode: "ANSWER" as const,
  answer: "No records",
  toolCalls: [
    {
      toolName: "get_my_schedule",
      status: "EXECUTED",
      riskLevel: "READ_ONLY"
    }
  ]
};
assert.equal(
  scoreCopilotEvalTask(task, {
    ...base,
    llm: { availableTools: ["get_my_schedule"] }
  }).registryFilteringFailure,
  false
);
assert.equal(
  scoreCopilotEvalTask(task, {
    ...base,
    llm: { availableTools: [] }
  }).failureCategory,
  "REGISTRY"
);
assert.equal(
  scoreCopilotEvalTask(task, {
    ...base,
    llm: { availableTools: [] }
  }).registryFilteringFailure,
  true
);

console.log("tool availability assertions passed");
