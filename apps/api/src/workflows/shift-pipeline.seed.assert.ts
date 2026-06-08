import assert from "node:assert/strict";
import { assertShiftCoverageInvariants } from "@pulseshift/domain";

import { demoShiftAssignments, demoShiftClaims, demoShiftSlots } from "./shift-pipeline.repository";
import { resetDemoShiftPipelineState, seedDemoShiftPipelineState } from "./shift-pipeline.seed";

seedDemoShiftPipelineState();

assert.ok(demoShiftSlots.length >= 9, "Expected demo shift slots to mirror the multi-week schedule sandbox");
assert.ok(demoShiftSlots.filter((slot) => slot.status === "OPEN").length >= 3, "Expected open demo slots");
assert.ok(
  demoShiftSlots.some((slot) => slot.startsAt.startsWith("2026-06-20") && slot.status === "OPEN"),
  "Expected future week open ICU slot"
);
assert.ok(
  demoShiftSlots.some(
    (slot) => slot.startsAt === "2026-06-08T11:00:00.000Z" && slot.roleRequiredId === "role_rn" && slot.status === "ASSIGNED"
  ),
  "Expected assigned next-shift slot for Priya"
);
assert.ok(
  demoShiftClaims.some((claim) => claim.status === "PENDING_APPROVAL" && claim.approvalRequestId),
  "Expected claim requiring manager approval"
);
assert.ok(demoShiftClaims.some((claim) => claim.status === "DENIED"), "Expected denied claim scenario");
assert.ok(demoShiftClaims.some((claim) => claim.status === "SUBMITTED"), "Expected submitted claim scenario");
assert.ok(demoShiftClaims.some((claim) => claim.status === "ASSIGNED" && claim.assignmentId), "Expected assigned claim scenario");

for (const slot of demoShiftSlots) {
  assert.equal(
    assertShiftCoverageInvariants({
      slot,
      assignments: demoShiftAssignments.filter((assignment) => assignment.slotId === slot.id),
      claims: demoShiftClaims.filter((claim) => claim.slotId === slot.id)
    }),
    true
  );
}

demoShiftSlots.splice(0);
demoShiftAssignments.splice(0);
demoShiftClaims.splice(0);
resetDemoShiftPipelineState();

assert.ok(demoShiftSlots.length >= 9);
assert.ok(demoShiftAssignments.length >= 6);
