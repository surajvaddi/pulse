import assert from "node:assert/strict";

import { evaluateAssignmentCandidate } from "./assignment-candidate";

const slot = {
  id: "slot_1",
  organizationId: "org_1",
  facilityId: "fac_1",
  unitId: "unit_1",
  roleRequiredId: "role_rn",
  certificationRequiredIds: ["cert_bls"],
  startsAt: "2026-07-06T12:00:00.000Z",
  endsAt: "2026-07-06T20:00:00.000Z",
  status: "OPEN" as const,
  source: "MANUAL" as const,
  riskFlags: []
};

const qualified = {
  employeeId: "emp_1",
  userId: "user_1",
  displayName: "Qualified",
  accountActive: true,
  employeeActive: true,
  unitId: "unit_1",
  roleId: "role_rn",
  verifiedCertificationIds: ["cert_bls"],
  unavailableWindows: [],
  assignedSlots: []
};
assert.equal(evaluateAssignmentCandidate(slot, qualified).eligibility, "ELIGIBLE");

const credential = evaluateAssignmentCandidate(slot, {
  ...qualified,
  verifiedCertificationIds: []
});
assert.equal(credential.eligibility, "BLOCKED");
assert.ok(credential.reasons.some((reason) => reason.includes("certifications")));

const crossUnit = evaluateAssignmentCandidate(slot, {
  ...qualified,
  unitId: "unit_2"
});
assert.equal(crossUnit.eligibility, "BLOCKED");
assert.ok(crossUnit.riskFlags.includes("UNIT_SCOPE_MISMATCH"));

const inactive = evaluateAssignmentCandidate(slot, {
  ...qualified,
  accountActive: false
});
assert.equal(inactive.eligibility, "BLOCKED");

const rest = evaluateAssignmentCandidate(slot, {
  ...qualified,
  assignedSlots: [
    {
      id: "previous",
      startsAt: "2026-07-06T01:00:00.000Z",
      endsAt: "2026-07-06T07:00:00.000Z"
    }
  ]
});
assert.equal(rest.eligibility, "BLOCKED");
assert.ok(rest.riskFlags.includes("REST_PERIOD_RISK"));

const overtime = evaluateAssignmentCandidate(slot, {
  ...qualified,
  assignedSlots: [
    {
      id: "a",
      startsAt: "2026-07-08T12:00:00.000Z",
      endsAt: "2026-07-10T00:00:00.000Z"
    }
  ]
});
assert.equal(overtime.eligibility, "WARNING");
assert.ok(overtime.riskFlags.includes("OVERTIME_RISK"));
