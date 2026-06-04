import { strict as assert } from "node:assert";
import { AccountRoleSchema } from "@pulseshift/domain";

import { adminUsers } from "../admin/admin-state";
import { demoSessions } from "../auth/demo-users";
import {
  demoAuditLogs,
  demoCredentials,
  demoEmployeeByUserId,
  demoNotifications,
  demoSchedules,
  demoStaffDirectory,
  demoTimecardExceptions,
  resetDemoWorkflowState
} from "./demo-data";

const sessionRoles = new Set(demoSessions.map((session) => session.role));
for (const role of AccountRoleSchema.options) {
  assert.ok(sessionRoles.has(role), `Missing demo session for ${role}`);
}

const adminUserRoles = new Set(adminUsers.flatMap((user) => user.roles));
for (const role of AccountRoleSchema.options) {
  assert.ok(adminUserRoles.has(role), `Missing admin user for ${role}`);
}

assert.ok(demoSchedules.length >= 8, "Expected multi-week schedule sandbox");
assert.ok(demoSchedules.some((shift) => shift.startsAt.startsWith("2026-06-20")));
assert.ok(demoSchedules.filter((shift) => shift.status === "OPEN").length >= 3);
assert.ok(demoEmployeeByUserId.has("user_aria_agency"));
assert.ok(demoStaffDirectory.some((member) => member.userId === "user_olivia_charge"));
assert.ok(demoCredentials.some((credential) => credential.employeeId === "emp_aria"));
assert.ok(demoTimecardExceptions.length >= 3);
assert.ok(demoNotifications.some((notification) => notification.recipientUserId === "user_evan_exec"));
assert.ok(demoAuditLogs.some((log) => log.action === "credential.review.expiring"));

const weekThreeOpenShift = demoSchedules.find((shift) => shift.id === "shift_open_icu_week3");
assert.ok(weekThreeOpenShift);
weekThreeOpenShift.status = "ASSIGNED";
weekThreeOpenShift.employeeId = "emp_priya";
weekThreeOpenShift.userId = "user_priya";
const firstException = demoTimecardExceptions.at(0);
assert.ok(firstException);
firstException.status = "RESOLVED";

resetDemoWorkflowState();

assert.equal(weekThreeOpenShift.status, "OPEN");
assert.equal(weekThreeOpenShift.employeeId, undefined);
assert.equal(weekThreeOpenShift.userId, undefined);
assert.ok(demoTimecardExceptions.every((exception) => exception.status === "OPEN"));
