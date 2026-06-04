import assert from "node:assert/strict";

import { buildPayrollDashboard } from "@/lib/payroll-dashboard";
import type { TimecardException } from "@/lib/api";

const exceptions: TimecardException[] = [
  {
    id: "exception_open",
    employeeId: "emp_priya",
    userId: "user_priya",
    unitId: "unit_icu",
    type: "MISSED_CLOCK_OUT",
    severity: "HIGH",
    status: "OPEN",
    explanation: "Missing clock out"
  },
  {
    id: "exception_resolved",
    employeeId: "emp_maya",
    userId: "user_maya",
    unitId: "unit_icu",
    type: "LATE_CLOCK_IN",
    severity: "LOW",
    status: "RESOLVED",
    explanation: "Resolved by payroll"
  }
];

const dashboard = buildPayrollDashboard(exceptions);

assert.equal(dashboard.openExceptions.length, 1);
assert.equal(dashboard.resolvedExceptions.length, 1);
assert.equal(dashboard.highestSeverity, "HIGH");
assert.equal(dashboard.cards.at(0)?.tone, "attention");
assert.equal(dashboard.cards.at(1)?.value, "1");

const emptyDashboard = buildPayrollDashboard([]);
assert.equal(emptyDashboard.highestSeverity, "NONE");
assert.equal(emptyDashboard.cards.at(0)?.tone, "ready");
