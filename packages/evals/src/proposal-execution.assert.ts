import assert from "node:assert/strict";

import { scoreCopilotEvalTask, type CopilotEvalTask } from "./index.js";

const task: CopilotEvalTask = {
  id: "proposal",
  title: "Proposal is scored before execution",
  actorUserId: "user_1",
  actorRole: "EMPLOYEE",
  prompt: "Show my schedule",
  expectedMode: "ANSWER",
  expectedTools: ["get_my_schedule"],
  forbiddenTools: [],
  requiredAnswerSignals: []
};
const result = scoreCopilotEvalTask(task, {
  mode: "ANSWER",
  answer: "No records",
  toolCalls: [
    {
      toolName: "compute_staffing_gaps",
      status: "EXECUTED",
      riskLevel: "READ_ONLY"
    }
  ],
  llm: { availableTools: ["get_my_schedule"] },
  evaluation: {
    proposals: [{ toolName: "get_my_schedule", argumentsJson: {} }],
    normalizedArguments: {},
    policyDecision: "ALLOWED",
    executionResult: "EMPTY"
  }
});
assert.equal(result.toolSelectionAccuracy, 1);
assert.equal(result.proposedTool, "get_my_schedule");
assert.equal(result.executionResult, "EMPTY");

console.log("proposal and execution separation assertions passed");
