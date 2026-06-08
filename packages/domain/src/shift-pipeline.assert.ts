import assert from "node:assert/strict";

import {
  ShiftAssignmentContractSchema,
  ShiftSwapCandidateContractSchema,
  ShiftSwapRequestContractSchema,
  ShiftClaimRequestContractSchema,
  ShiftPolicyDecisionSnapshotSchema,
  ShiftSlotContractSchema,
  StaffingRequirementContractSchema,
  assertShiftCoverageInvariants,
  assertShiftSwapInvariants,
  operationalShiftFromSlot
} from "./index.js";

const evaluatedAt = "2026-06-07T10:00:00.000Z";

const policyDecision = ShiftPolicyDecisionSnapshotSchema.parse({
  allowed: true,
  requiresApproval: true,
  riskFlags: ["OVERTIME_RISK"],
  blockingReasons: [],
  warnings: ["Manager approval required before assignment."],
  evaluatedAt
});

const requirement = StaffingRequirementContractSchema.parse({
  id: "requirement_icu_night_rn",
  organizationId: "org_pulseshift_demo",
  facilityId: "fac_mercy_main",
  unitId: "unit_icu",
  roleId: "role_rn",
  certificationRequiredIds: ["cert_acls"],
  startAt: "2026-06-08T23:00:00.000Z",
  endAt: "2026-06-09T11:00:00.000Z",
  minRequired: 4,
  idealRequired: 5,
  source: "TEMPLATE"
});
assert.equal(requirement.minRequired, 4);

const slot = ShiftSlotContractSchema.parse({
  id: "slot_icu_night_rn_1",
  organizationId: "org_pulseshift_demo",
  facilityId: "fac_mercy_main",
  unitId: "unit_icu",
  requirementId: requirement.id,
  roleRequiredId: "role_rn",
  certificationRequiredIds: ["cert_acls"],
  startsAt: requirement.startAt,
  endsAt: requirement.endAt,
  status: "ASSIGNED",
  source: "TEMPLATE",
  riskFlags: []
});

const assignment = ShiftAssignmentContractSchema.parse({
  id: "assignment_1",
  organizationId: slot.organizationId,
  slotId: slot.id,
  employeeId: "emp_priya",
  assignedByUserId: "user_jordan_manager",
  status: "ACTIVE",
  source: "CLAIM",
  createdAt: "2026-06-07T10:05:00.000Z"
});

const claim = ShiftClaimRequestContractSchema.parse({
  id: "claim_1",
  organizationId: slot.organizationId,
  slotId: slot.id,
  employeeId: "emp_priya",
  userId: "user_priya",
  status: "ASSIGNED",
  policyDecision,
  approvalRequestId: "approval_1",
  assignmentId: assignment.id,
  createdAt: "2026-06-07T10:01:00.000Z",
  decidedAt: "2026-06-07T10:04:00.000Z"
});

assert.equal(assertShiftCoverageInvariants({ slot, assignments: [assignment], claims: [claim] }), true);
const operationalShift = operationalShiftFromSlot({ slot, assignment });
assert.equal(operationalShift.slotId, slot.id);
assert.equal(operationalShift.employeeId, assignment.employeeId);
assert.equal(operationalShift.swappable, true);
assert.equal(operationalShift.claimable, false);

const candidate = ShiftSwapCandidateContractSchema.parse({
  userId: "user_maya",
  employeeId: "emp_maya",
  displayName: "Maya Shah",
  eligible: true,
  requiresApproval: true,
  riskFlags: ["MANAGER_APPROVAL_REQUIRED"],
  blockingReasons: [],
  warnings: ["Manager approval required before the reassignment is final."],
  evaluatedAt
});
assert.equal(candidate.eligible, true);

const swap = ShiftSwapRequestContractSchema.parse({
  id: "swap_1",
  organizationId: slot.organizationId,
  originalSlotId: slot.id,
  requesterEmployeeId: assignment.employeeId,
  requesterUserId: "user_priya",
  proposedEmployeeId: candidate.employeeId,
  proposedUserId: candidate.userId,
  unitId: slot.unitId,
  status: "PENDING_MANAGER",
  policyDecision,
  managerApprovalRequired: true,
  approvalRequestId: "approval_swap_1",
  createdAt: "2026-06-07T10:10:00.000Z"
});
assert.equal(assertShiftSwapInvariants({ swap, originalShift: operationalShift }), true);
assert.throws(
  () =>
    assertShiftSwapInvariants({
      swap: { ...swap, id: "swap_self", proposedUserId: swap.requesterUserId },
      originalShift: operationalShift
    }),
  /cannot target/
);

assert.throws(
  () =>
    assertShiftCoverageInvariants({
      slot,
      assignments: [assignment, { ...assignment, id: "assignment_2" }],
      claims: [claim]
    }),
  /more than one active assignment/
);

assert.throws(
  () =>
    assertShiftCoverageInvariants({
      slot,
      assignments: [assignment],
      claims: [{ ...claim, id: "claim_pending", status: "PENDING_APPROVAL", approvalRequestId: undefined }]
    }),
  /must reference an approval request/
);
