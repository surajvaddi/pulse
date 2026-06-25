import assert from "node:assert/strict";

import { PermissionService } from "../auth/permission.service";
import { demoSessions } from "../auth/demo-users";
import { demoApprovals } from "../demo/demo-data";
import { ShiftPipelineRepositoryProvider, demoShiftAssignments, demoShiftSlots } from "./shift-pipeline.repository";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";
import { ShiftSwapEligibilityService } from "./shift-swap-eligibility.service";
import { ShiftSwapService, demoShiftSwapRequests } from "./shift-swap.service";
import { ShiftSwapRepositoryProvider } from "./shift-swap.repository";

function session(userId: string) {
  const found = demoSessions.find((candidate) => candidate.userId === userId);
  assert.ok(found);
  return found;
}

async function rejectsWithMessage(action: () => Promise<unknown>, message: string) {
  try {
    await action();
    assert.fail(`Expected rejection containing: ${message}`);
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.ok(error.message.includes(message), error.message);
  }
}

async function main() {
  seedDemoShiftPipelineState();
  demoShiftSlots.push({
    id: "slot_shift_priya_future_swap_service",
    organizationId: "org_pulseshift_demo",
    facilityId: "fac_mercy_main",
    unitId: "unit_icu",
    roleRequiredId: "role_rn",
    certificationRequiredIds: ["cert_bls", "cert_acls", "cert_icu_qualified"],
    startsAt: "2026-07-20T11:00:00.000Z",
    endsAt: "2026-07-20T23:00:00.000Z",
    status: "ASSIGNED",
    source: "MANUAL",
    riskFlags: []
  });
  demoShiftAssignments.push({
    id: "assignment_priya_future_swap_service",
    organizationId: "org_pulseshift_demo",
    slotId: "slot_shift_priya_future_swap_service",
    employeeId: "emp_priya",
    assignedByUserId: "user_jordan_manager",
    status: "ACTIVE",
    source: "MANAGER_ASSIGNMENT",
    createdAt: "2026-06-07T12:00:00.000Z"
  });
  demoShiftSwapRequests.splice(0, demoShiftSwapRequests.length);

  const repositoryProvider = new ShiftPipelineRepositoryProvider();
  const service = new ShiftSwapService(
    new PermissionService(),
    new ShiftSwapEligibilityService(),
    repositoryProvider,
    new ShiftSwapRepositoryProvider()
  );

  await rejectsWithMessage(
    () =>
      service.createSwapRequest(session("user_priya"), {
        originalSlotId: "slot_shift_priya_future_swap_service",
        proposedUserId: "user_priya"
      }),
    "Proposed swap candidate is not eligible."
  );

  const swap = await service.createSwapRequest(session("user_priya"), {
    originalSlotId: "slot_shift_priya_future_swap_service",
    proposedUserId: "user_maya"
  });
  assert.equal(swap.status, "PENDING_COUNTERPARTY");
  assert.equal(swap.requesterEmployeeId, "emp_priya");
  assert.equal(swap.proposedEmployeeId, "emp_maya");

  await rejectsWithMessage(
    () => service.respondToSwap(session("user_priya"), swap.id, { decision: "accept" }),
    "Only the proposed counterpart can respond"
  );

  const accepted = await service.respondToSwap(session("user_maya"), swap.id, { decision: "accept" });
  assert.equal(accepted.status, "PENDING_MANAGER");
  assert.ok(accepted.approvalRequestId);
  assert.ok(demoApprovals.some((approval) => approval.id === accepted.approvalRequestId && approval.approvalType === "SHIFT_SWAP"));

  await rejectsWithMessage(
    () => service.decideSwap(session("user_priya"), swap.id, { decision: "approve" }),
    "User is not allowed to approve swaps"
  );

  const approved = await service.decideSwap(session("user_jordan_manager"), swap.id, {
    decision: "approve",
    reason: "Coverage remains safe."
  });
  assert.equal(approved.status, "APPROVED");
  assert.equal(approved.assignment.employeeId, "emp_maya");
  assert.equal(approved.assignment.source, "SWAP");
  assert.equal(approved.swap.assignmentId, approved.assignment.id);

  const slotAssignments = demoShiftAssignments.filter((assignment) => assignment.slotId === "slot_shift_priya_future_swap_service");
  assert.equal(slotAssignments.filter((assignment) => assignment.status === "ACTIVE").length, 1);
  assert.equal(slotAssignments.find((assignment) => assignment.status === "ACTIVE")?.employeeId, "emp_maya");
  assert.equal(slotAssignments.find((assignment) => assignment.employeeId === "emp_priya")?.status, "SUPERSEDED");
}

void main();
