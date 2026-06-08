import assert from "node:assert/strict";

import { demoSessions } from "../auth/demo-users";
import { ShiftSwapEligibilityService } from "./shift-swap-eligibility.service";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";

function session(userId: string) {
  const found = demoSessions.find((candidate) => candidate.userId === userId);
  assert.ok(found);
  return found;
}

seedDemoShiftPipelineState();

const service = new ShiftSwapEligibilityService();
const swappable = service.listSwappableShifts(session("user_priya"));
assert.ok(swappable.some((shift) => shift.slotId === "slot_shift_priya_week2_icu_day"));
assert.ok(swappable.every((shift) => shift.swappable));

const { originalShift, decision } = service.evaluateOriginalShift(session("user_priya"), "slot_shift_priya_week2_icu_day");
assert.equal(decision.allowed, true);
assert.equal(originalShift.employeeId, "emp_priya");

const candidates = service.listCandidates(session("user_priya"), "slot_shift_priya_week2_icu_day");
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
