import { strict as assert } from "node:assert";
import { assertShiftCoverageInvariants } from "@pulseshift/domain";
import {
  demoShiftAssignments,
  demoShiftClaims,
  demoShiftSlots,
  InMemoryShiftPipelineRepository
} from "./shift-pipeline.repository";

demoShiftSlots.splice(0);
demoShiftAssignments.splice(0);
demoShiftClaims.splice(0);

async function run() {
  const repository = new InMemoryShiftPipelineRepository();

  demoShiftSlots.push({
    id: "slot_repository_assertion",
    organizationId: "org_demo",
    facilityId: "facility_main",
    unitId: "unit_memory_care",
    requirementId: "requirement_day_rn",
    roleRequiredId: "role_rn",
    certificationRequiredIds: ["cert_bls"],
    startsAt: "2026-06-15T11:00:00.000Z",
    endsAt: "2026-06-15T19:00:00.000Z",
    status: "OPEN",
    source: "MANUAL",
    riskFlags: []
  });

  const slot = await repository.findSlot({ organizationId: "org_demo", slotId: "slot_repository_assertion" });
  assert.equal(slot?.status, "OPEN");

  const claim = await repository.createClaim({
    id: "claim_repository_assertion",
    organizationId: "org_demo",
    slotId: "slot_repository_assertion",
    employeeId: "employee_priya",
    userId: "user_priya",
    status: "PENDING_APPROVAL",
    approvalRequestId: "approval_repository_assertion",
    policyDecision: {
      allowed: true,
      requiresApproval: true,
      riskFlags: ["OVERTIME_REVIEW"],
      blockingReasons: [],
      warnings: ["Overtime threshold requires manager approval"],
      evaluatedAt: "2026-06-10T12:00:00.000Z"
    }
  });

  assert.equal(claim.approvalRequestId, "approval_repository_assertion");
  assert.equal((await repository.listClaims({ organizationId: "org_demo", slotId: "slot_repository_assertion" })).length, 1);

  const assignment = await repository.createAssignment({
    id: "assignment_repository_assertion",
    organizationId: "org_demo",
    slotId: "slot_repository_assertion",
    employeeId: "employee_priya",
    assignedByUserId: "user_manager",
    status: "ACTIVE",
    source: "CLAIM"
  });

  await repository.updateClaim({
    organizationId: "org_demo",
    claimId: claim.id,
    status: "APPROVED",
    assignmentId: assignment.id,
    decidedAt: "2026-06-10T12:05:00.000Z"
  });

  const updatedSlot = await repository.updateSlotStatus({
    organizationId: "org_demo",
    slotId: "slot_repository_assertion",
    status: "ASSIGNED"
  });
  const activeAssignment = await repository.findActiveAssignmentForSlot({
    organizationId: "org_demo",
    slotId: "slot_repository_assertion"
  });
  const [updatedClaim] = await repository.listClaims({ organizationId: "org_demo", statuses: ["APPROVED"] });

  assert.equal(updatedSlot.status, "ASSIGNED");
  assert.equal(activeAssignment?.id, assignment.id);
  assert.ok(updatedClaim);
  assert.equal(updatedClaim.assignmentId, assignment.id);

  assertShiftCoverageInvariants({
    slot: updatedSlot,
    assignments: [assignment],
    claims: [updatedClaim]
  });
}

void run();
