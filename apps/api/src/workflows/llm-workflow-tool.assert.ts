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
assert.equal(swapTool.inputSchema.safeParse({ originalSlotId: "slot_1", proposedUserId: "user_maya" }).success, true);
assert.equal(swapTool.inputSchema.safeParse({ originalShiftId: "shift_1", proposedUserId: "user_maya" }).success, false);

const listSwappableTool = llmWorkflowTools.find((tool) => tool.name === "list_swappable_shifts");
assert.ok(listSwappableTool);
assert.equal(listSwappableTool.riskLevel, "READ_ONLY");
assert.equal(listSwappableTool.roleAccess.EMPLOYEE, "ALLOWED");

const listSwapCandidatesTool = llmWorkflowTools.find((tool) => tool.name === "list_shift_swap_candidates");
assert.ok(listSwapCandidatesTool);
assert.equal(listSwapCandidatesTool.riskLevel, "READ_ONLY");
assert.equal(listSwapCandidatesTool.inputSchema.safeParse({ originalSlotId: "slot_1" }).success, true);

const respondSwapTool = llmWorkflowTools.find((tool) => tool.name === "respond_shift_swap");
assert.ok(respondSwapTool);
assert.equal(respondSwapTool.allowsMutation, true);
assert.equal(respondSwapTool.requiresPolicyGate, true);
assert.equal(respondSwapTool.requiresPreview, true);
assert.equal(respondSwapTool.inputSchema.safeParse({ swapId: "swap_1", decision: "accept" }).success, true);

const managerTools = llmWorkflowToolRegistry.availableFor(
  { role: "UNIT_MANAGER", currentPage: "/app/manager" },
  "MANAGER_OPERATIONS"
);
assert.ok(managerTools.some((tool) => tool.name === "decide_shift_swap"));
assert.ok(managerTools.some((tool) => tool.name === "compute_staffing_gaps"));
assert.ok(managerTools.some((tool) => tool.name === "list_shift_pipeline_slots"));
assert.ok(managerTools.some((tool) => tool.name === "decide_shift_claim"));
assert.ok(managerTools.some((tool) => tool.name === "direct_assign_shift_slot"));

const claimSlotTool = llmWorkflowTools.find((tool) => tool.name === "claim_shift_slot");
assert.ok(claimSlotTool);
assert.equal(claimSlotTool.allowsMutation, true);
assert.equal(claimSlotTool.requiresPolicyGate, true);
assert.equal(claimSlotTool.requiresPreview, true);
assert.equal(claimSlotTool.roleAccess.EMPLOYEE, "APPROVAL_REQUIRED");
assert.equal(claimSlotTool.roleAccess.UNIT_MANAGER, "BLOCKED");

const directAssignTool = llmWorkflowTools.find((tool) => tool.name === "direct_assign_shift_slot");
assert.ok(directAssignTool);
assert.equal(directAssignTool.riskLevel, "APPROVAL_REQUIRED");
assert.equal(directAssignTool.roleAccess.UNIT_MANAGER, "APPROVAL_REQUIRED");
assert.equal(directAssignTool.roleAccess.EMPLOYEE, "BLOCKED");

const decideSwapTool = llmWorkflowTools.find((tool) => tool.name === "decide_shift_swap");
assert.ok(decideSwapTool);
assert.equal(decideSwapTool.roleAccess.UNIT_MANAGER, "APPROVAL_REQUIRED");
assert.equal(decideSwapTool.roleAccess.EMPLOYEE, "BLOCKED");
assert.equal(decideSwapTool.inputSchema.safeParse({ swapId: "swap_1", decision: "approve", reason: "Safe coverage" }).success, true);

const createSlotsTool = llmWorkflowTools.find((tool) => tool.name === "create_shift_slots_from_requirement");
assert.ok(createSlotsTool);
assert.equal(createSlotsTool.roleAccess.WORKFORCE_ADMIN, "APPROVAL_REQUIRED");
assert.equal(createSlotsTool.roleAccess.EMPLOYEE, "BLOCKED");
assert.equal(createSlotsTool.requiresPreview, true);

const publishSlotsTool = llmWorkflowTools.find((tool) => tool.name === "publish_shift_slots");
assert.ok(publishSlotsTool);
assert.equal(publishSlotsTool.roleAccess.WORKFORCE_ADMIN, "APPROVAL_REQUIRED");
assert.equal(publishSlotsTool.inputSchema.safeParse({ facilityId: "fac_1", slotIds: ["slot_1"] }).success, true);

const employeeManagerTools = llmWorkflowToolRegistry.availableFor(
  { role: "EMPLOYEE", currentPage: "/app/manager" },
  "MANAGER_OPERATIONS"
);
assert.equal(employeeManagerTools.some((tool) => tool.name === "decide_shift_swap"), false);
assert.equal(employeeManagerTools.some((tool) => tool.name === "decide_shift_claim"), false);

const blockedTimecardTool = llmWorkflowTools.find((tool) => tool.name === "edit_timecard_event");
assert.ok(blockedTimecardTool);
assert.equal(blockedTimecardTool.riskLevel, "BLOCKED");
assert.equal(blockedTimecardTool.roleAccess.SYSTEM_ADMIN, "BLOCKED");

const blockedSqlTool = llmWorkflowTools.find((tool) => tool.name === "blocked_database_request");
assert.ok(blockedSqlTool);
assert.equal(blockedSqlTool.riskLevel, "BLOCKED");
