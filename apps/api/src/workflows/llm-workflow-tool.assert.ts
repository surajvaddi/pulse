import assert from "node:assert/strict";

import {
  assertLlmWorkflowToolsSafe,
  llmWorkflowToolRegistry,
  llmWorkflowTools
} from "./llm-workflow-tool.registry";

assert.equal(assertLlmWorkflowToolsSafe(), true);

const swapTool = llmWorkflowTools.find((tool) => tool.name === "create_shift_swap_request");
assert.ok(swapTool);
assert.equal(swapTool.allowsMutation, true);
assert.equal(swapTool.requiresPolicyGate, true);
assert.equal(swapTool.requiresPreview, true);
assert.equal(swapTool.roleAccess.EMPLOYEE, "APPROVAL_REQUIRED");
assert.equal(swapTool.roleAccess.PAYROLL_ADMIN, "BLOCKED");

const managerTools = llmWorkflowToolRegistry.availableFor(
  { role: "UNIT_MANAGER", currentPage: "/app/manager" },
  "MANAGER_OPERATIONS"
);
assert.ok(managerTools.some((tool) => tool.name === "approve_shift_swap"));
assert.ok(managerTools.some((tool) => tool.name === "compute_staffing_gaps"));

const employeeManagerTools = llmWorkflowToolRegistry.availableFor(
  { role: "EMPLOYEE", currentPage: "/app/manager" },
  "MANAGER_OPERATIONS"
);
assert.equal(employeeManagerTools.some((tool) => tool.name === "approve_shift_swap"), false);

const blockedTimecardTool = llmWorkflowTools.find((tool) => tool.name === "edit_timecard_event");
assert.ok(blockedTimecardTool);
assert.equal(blockedTimecardTool.riskLevel, "BLOCKED");
assert.equal(blockedTimecardTool.roleAccess.SYSTEM_ADMIN, "BLOCKED");

const blockedSqlTool = llmWorkflowTools.find((tool) => tool.name === "blocked_database_request");
assert.ok(blockedSqlTool);
assert.equal(blockedSqlTool.riskLevel, "BLOCKED");
