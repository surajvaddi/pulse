import assert from "node:assert/strict";

import { demoSessions } from "../auth/demo-users";
import { ShiftSwapEligibilityService } from "./shift-swap-eligibility.service";
import { demoShiftAssignments, demoShiftSlots } from "./shift-pipeline.repository";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";

function session(userId: string) {
  const found = demoSessions.find((candidate) => candidate.userId === userId);
  assert.ok(found);
  return found;
}

seedDemoShiftPipelineState();
demoShiftSlots.push({
  id: "slot_shift_priya_future_swap_assertion",
  organizationId: "org_pulseshift_demo",
  facilityId: "fac_mercy_main",
  unitId: "unit_icu",
  roleRequiredId: "role_rn",
  certificationRequiredIds: ["cert_bls", "cert_acls", "cert_icu_qualified"],
  startsAt: "2026-06-20T11:00:00.000Z",
  endsAt: "2026-06-20T23:00:00.000Z",
  status: "ASSIGNED",
  source: "MANUAL",
  riskFlags: []
});
demoShiftAssignments.push({
  id: "assignment_priya_future_swap_assertion",
  organizationId: "org_pulseshift_demo",
  slotId: "slot_shift_priya_future_swap_assertion",
  employeeId: "emp_priya",
  assignedByUserId: "user_jordan_manager",
  status: "ACTIVE",
  source: "MANAGER_ASSIGNMENT",
  createdAt: "2026-06-07T12:00:00.000Z"
});

const service = new ShiftSwapEligibilityService();
const swappable = service.listSwappableShifts(session("user_priya"));
assert.ok(swappable.some((shift) => shift.slotId === "slot_shift_priya_future_swap_assertion"));
assert.ok(swappable.every((shift) => shift.swappable));

const { originalShift, decision } = service.evaluateOriginalShift(session("user_priya"), "slot_shift_priya_future_swap_assertion");
assert.equal(decision.allowed, true);
assert.equal(originalShift.employeeId, "emp_priya");

const candidates = service.listCandidates(session("user_priya"), "slot_shift_priya_future_swap_assertion");
const maya = candidates.find((candidate) => candidate.userId === "user_maya");
assert.ok(maya);
assert.equal(maya.eligible, true);
assert.ok(maya.riskFlags.includes("MANAGER_APPROVAL_REQUIRED"));

const priya = candidates.find((candidate) => candidate.userId === "user_priya");
assert.ok(priya);
assert.equal(priya.eligible, false);
assert.ok(priya.blockingReasons.some((reason) => reason.includes("requesting employee")));

const agency = candidates.find((candidate) => candidate.userId === "user_aria_agency");
assert.ok(agency);
assert.equal(agency.eligible, false);
