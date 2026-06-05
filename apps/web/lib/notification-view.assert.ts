import assert from "node:assert/strict";

import {
  notificationActionFor,
  notificationMetadata,
  notificationSummary,
  notificationTitle
} from "./notification-view";
import type { Notification } from "./api";

const approval: Notification = {
  id: "notification_approval",
  organizationId: "org_pulseshift_demo",
  recipientUserId: "user_jordan_manager",
  channel: "IN_APP",
  type: "APPROVAL_REQUIRED",
  category: "APPROVAL",
  priority: "URGENT",
  status: "QUEUED",
  payload: { approvalId: "approval_1" },
  retryCount: 0
};

assert.equal(notificationTitle(approval), "Approval required");
assert.equal(notificationSummary(approval), "Approval review is waiting for a manager.");
assert.equal(notificationMetadata(approval), "Approval · Urgent · IN APP · queued");
assert.deepEqual(notificationActionFor(approval, { role: "UNIT_MANAGER" }), {
  label: "Review",
  href: "/app/manager"
});
assert.equal(notificationActionFor(approval, { role: "AI_AGENT_SERVICE" }), null);

const fallback: Notification = {
  ...approval,
  id: "notification_unknown",
  type: "UNKNOWN_EVENT",
  category: "SYSTEM",
  priority: "NORMAL",
  payload: { shiftId: "shift_1" }
};

assert.equal(notificationSummary(fallback), "Shift id: shift_1");
