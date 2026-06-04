import assert from "node:assert/strict";

import { buildEmployeeDashboard } from "@/lib/employee-dashboard";
import type { DemoShift, SessionSummary, TimecardException, TimeclockStatus } from "@/lib/api";

const session: SessionSummary = {
  userId: "user_priya",
  organizationId: "org_pulseshift_demo",
  displayName: "Priya Raman",
  email: "priya.nurse@example.com",
  role: "EMPLOYEE",
  permissions: ["schedule:read:self", "timecard:read:self", "timecard:write:self", "ai:use"]
};

const shift: DemoShift = {
  id: "shift_1",
  userId: "user_priya",
  unitId: "unit_icu",
  facilityId: "facility_main",
  title: "ICU Day Shift",
  startsAt: "2026-06-05T11:00:00.000Z",
  endsAt: "2026-06-05T19:00:00.000Z",
  status: "ASSIGNED"
};

const clockedOut: TimeclockStatus = {
  employeeId: "emp_priya",
  status: "CLOCKED_OUT",
  currentShiftId: "shift_1",
  currentShiftTitle: "ICU Day Shift",
  lastEvent: null
};

const exception: TimecardException = {
  id: "exception_1",
  employeeId: "emp_priya",
  userId: "user_priya",
  unitId: "unit_icu",
  type: "MISSED_CLOCK_OUT",
  severity: "MEDIUM",
  status: "OPEN",
  explanation: "Missing clock out for previous shift"
};

const dashboard = buildEmployeeDashboard({
  session,
  shifts: [shift],
  exceptions: [exception],
  clockStatus: clockedOut
});

assert.equal(dashboard.firstName, "Priya");
assert.equal(dashboard.nextShift?.id, "shift_1");
assert.equal(dashboard.primaryAction, "CLOCK_IN");
assert.equal(dashboard.cards.at(2)?.tone, "attention");

const clockedIn = buildEmployeeDashboard({
  session,
  shifts: [],
  exceptions: [{ ...exception, status: "RESOLVED" }],
  clockStatus: { ...clockedOut, status: "CLOCKED_IN" }
});

assert.equal(clockedIn.primaryAction, "CLOCK_OUT");
assert.equal(clockedIn.cards.at(0)?.value, "No upcoming shift");
assert.equal(clockedIn.cards.at(2)?.tone, "ready");
