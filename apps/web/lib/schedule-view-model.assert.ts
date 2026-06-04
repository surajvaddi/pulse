import assert from "node:assert/strict";

import { buildScheduleViewModel } from "@/lib/schedule-view-model";
import type { DemoShift } from "@/lib/api";

const shifts: DemoShift[] = [
  {
    id: "shift_late",
    unitId: "unit_icu",
    facilityId: "facility_main",
    title: "ICU Night",
    startsAt: "2026-06-06T23:00:00.000Z",
    endsAt: "2026-06-07T07:00:00.000Z",
    status: "OPEN"
  },
  {
    id: "shift_early",
    userId: "user_priya",
    unitId: "unit_icu",
    facilityId: "facility_main",
    title: "ICU Day",
    startsAt: "2026-06-05T11:00:00.000Z",
    endsAt: "2026-06-05T19:00:00.000Z",
    status: "ASSIGNED"
  },
  {
    id: "shift_pending",
    userId: "user_priya",
    unitId: "unit_icu",
    facilityId: "facility_main",
    title: "ICU Swap Review",
    startsAt: "2026-06-05T21:00:00.000Z",
    endsAt: "2026-06-06T01:00:00.000Z",
    status: "PENDING_SWAP"
  }
];

const model = buildScheduleViewModel(shifts);

assert.equal(model.groups.length, 2);
assert.equal(model.groups.at(0)?.dateKey, "2026-06-05");
assert.equal(model.selectedShift?.id, "shift_early");
assert.equal(model.summary.assignedCount, 1);
assert.equal(model.summary.openCount, 1);
assert.equal(model.summary.pendingCount, 1);
assert.equal(model.summary.totalHours, 20);
assert.equal(model.groups.at(1)?.shifts.at(0)?.statusTone, "open");
