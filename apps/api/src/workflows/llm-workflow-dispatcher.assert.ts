import assert from "node:assert/strict";

import {
  llmWorkflowExecutorNames
} from "./llm-workflow-dispatcher.service";
import { llmWorkflowTools } from "./llm-workflow-tool.registry";

assert.deepEqual(
  [...llmWorkflowExecutorNames].sort(),
  llmWorkflowTools.map((tool) => tool.name).sort()
);
for (const tool of llmWorkflowTools) {
  assert.ok(llmWorkflowExecutorNames.includes(tool.name));
  assert.notEqual(tool.roleAccess.EMPLOYEE, undefined);
  assert.notEqual(tool.roleAccess.ORGANIZATION_OWNER, undefined);
}

console.log("LLM workflow dispatcher assertions passed");
