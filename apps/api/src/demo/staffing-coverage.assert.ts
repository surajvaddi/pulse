import assert from "node:assert/strict";

import { calculateCoverageGap } from "./operations.repository";

type CoverageEmployee = {
  roleId: string;
  certifications: Array<{
    certificationId: string;
    status: string;
    expiresAt: string | null;
  }>;
  availabilityWindows: Array<{
    type: string;
    status: string;
    startsAt: string;
    endsAt: string;
  }>;
};

const qualifiedEmployee: CoverageEmployee = {
  roleId: "role_rn",
  certifications: [
    {
      certificationId: "cert_bls",
      status: "VERIFIED",
      expiresAt: "2027-01-01T00:00:00.000Z"
    }
  ],
  availabilityWindows: []
};

function coverage(
  requiredCount: number,
  employees: CoverageEmployee[],
  roleId = "role_rn"
) {
  return calculateCoverageGap({
    id: `req_${requiredCount}_${employees.length}`,
    unitId: "unit_1",
    role: "RN",
    roleId,
    requiredCount,
    certificationRequiredIds: ["cert_bls"],
    startsAt: "2026-07-10T12:00:00.000Z",
    endsAt: "2026-07-10T20:00:00.000Z",
    slots: employees.map((employee) => ({
      status: "ASSIGNED",
      assignments: [{ status: "ACTIVE", employee }]
    }))
  });
}

assert.equal(coverage(2, [qualifiedEmployee, qualifiedEmployee]).gapCount, 0);
assert.equal(coverage(2, [qualifiedEmployee]).gapCount, 1);
assert.equal(
  coverage(1, [qualifiedEmployee, qualifiedEmployee]).severity,
  "OVERSTAFFED"
);
assert.equal(
  coverage(1, [
    { ...qualifiedEmployee, certifications: [] }
  ]).assignedCount,
  0
);
assert.equal(
  coverage(1, [
    {
      ...qualifiedEmployee,
      availabilityWindows: [
        {
          type: "UNAVAILABLE",
          status: "ACTIVE",
          startsAt: "2026-07-10T13:00:00.000Z",
          endsAt: "2026-07-10T14:00:00.000Z"
        }
      ]
    }
  ]).assignedCount,
  0
);
assert.equal(coverage(1, [qualifiedEmployee], "role_charge").assignedCount, 0);
