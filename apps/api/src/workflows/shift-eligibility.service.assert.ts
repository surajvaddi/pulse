import assert from "node:assert/strict";

import { demoSessions } from "../auth/demo-users";
import { demoShiftAssignments, demoShiftSlots } from "./shift-pipeline.repository";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";
import { ShiftEligibilityService } from "./shift-eligibility.service";

seedDemoShiftPipelineState();

const eligibility = new ShiftEligibilityService();
const priya = demoSessions.find((session) => session.userId === "user_priya");
const maya = demoSessions.find((session) => session.userId === "user_maya");
const aria = demoSessions.find((session) => session.userId === "user_aria_agency");
assert.ok(priya);
assert.ok(maya);
assert.ok(aria);

const openIcuNight = demoShiftSlots.find((slot) => slot.id === "slot_shift_open_icu_night");
const openEdDay = demoShiftSlots.find((slot) => slot.id === "slot_shift_open_ed_day_week2");
const openIcuWeekThree = demoShiftSlots.find((slot) => slot.id === "slot_shift_open_icu_week3");
const assignedPriyaShift = demoShiftSlots.find((slot) => slot.id === "slot_shift_priya_week2_icu_day");
assert.ok(openIcuNight);
assert.ok(openEdDay);
assert.ok(openIcuWeekThree);
assert.ok(assignedPriyaShift);

const priyaDecision = eligibility.evaluateClaim({
  session: priya,
  slot: openIcuNight,
  evaluatedAt: "2026-06-07T12:30:00.000Z"
});
assert.equal(priyaDecision.allowed, true);
assert.equal(priyaDecision.requiresApproval, true);
assert.ok(priyaDecision.riskFlags.includes("OVERTIME_RISK"));

const mayaDecision = eligibility.evaluateClaim({
  session: maya,
  slot: openIcuWeekThree,
  evaluatedAt: "2026-06-07T12:31:00.000Z"
});
assert.equal(mayaDecision.allowed, true);
assert.equal(mayaDecision.requiresApproval, false);

const ariaDecision = eligibility.evaluateClaim({
  session: aria,
  slot: openEdDay,
  evaluatedAt: "2026-06-07T12:32:00.000Z"
});
assert.equal(ariaDecision.allowed, false);
assert.ok(ariaDecision.riskFlags.includes("UNIT_SCOPE_MISMATCH"));
assert.ok(ariaDecision.blockingReasons.some((reason) => reason.includes("shift unit")));

const assignedDecision = eligibility.evaluateClaim({
  session: maya,
  slot: assignedPriyaShift,
  evaluatedAt: "2026-06-07T12:33:00.000Z"
});
assert.equal(assignedDecision.allowed, false);
assert.ok(assignedDecision.blockingReasons.some((reason) => reason.includes("not open")));

const restRiskDecision = eligibility.evaluateClaim({
  session: maya,
  slot: {
    ...openIcuWeekThree,
    id: "slot_rest_conflict",
    startsAt: "2026-06-10T08:00:00.000Z",
    endsAt: "2026-06-10T16:00:00.000Z"
  },
  assignments: demoShiftAssignments,
  slots: demoShiftSlots,
  evaluatedAt: "2026-06-07T12:34:00.000Z"
});
assert.equal(restRiskDecision.allowed, false);
assert.ok(restRiskDecision.riskFlags.includes("REST_PERIOD_RISK"));
