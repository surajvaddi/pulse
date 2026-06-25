import assert from "node:assert/strict";
import type { ShiftSlotContract } from "@pulseshift/domain";

import {
  applyOpenShiftFilters,
  type OpenShiftResult
} from "./open-shift.service";

const slot: ShiftSlotContract = {
  id: "slot_1",
  organizationId: "org_1",
  facilityId: "fac_1",
  unitId: "unit_1",
  roleRequiredId: "role_rn",
  certificationRequiredIds: [],
  startsAt: "2026-07-01T12:00:00.000Z",
  endsAt: "2026-07-01T20:00:00.000Z",
  status: "OPEN",
  source: "MANUAL",
  riskFlags: []
};

const result: OpenShiftResult = {
  slot,
  eligibility: {
    employeeId: "employee_1",
    userId: "user_1",
    displayName: "Taylor",
    eligibility: "WARNING",
    reasons: ["Overtime review required."],
    riskFlags: ["OVERTIME_RISK"]
  }
};

assert.equal(
  applyOpenShiftFilters([result], {
    dateFrom: "2026-07-01",
    dateTo: "2026-07-02",
    roleId: "role_rn",
    minDurationHours: 8,
    maxDurationHours: 12
  }).length,
  1
);
assert.equal(applyOpenShiftFilters([result], { roleId: "role_lpn" }).length, 0);
assert.equal(
  applyOpenShiftFilters([result], { overtimeRisk: "exclude" }).length,
  0
);
assert.throws(
  () =>
    applyOpenShiftFilters([result], {
      dateFrom: "2026-07-03",
      dateTo: "2026-07-01"
    }),
  /dateFrom/
);

console.log("open shift filter assertions passed");
