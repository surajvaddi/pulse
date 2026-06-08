import assert from "node:assert/strict";

import { demoSessions } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { demoAuditLogs, demoNotifications, resetDemoWorkflowState } from "../demo/demo-data";
import { ShiftClaimService } from "./shift-claim.service";
import { ShiftEligibilityService } from "./shift-eligibility.service";
import { ShiftManagerService } from "./shift-manager.service";
import { demoShiftClaims } from "./shift-pipeline.repository";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";

function session(userId: string) {
  const found = demoSessions.find((candidate) => candidate.userId === userId);
  assert.ok(found);
  return found;
}

async function run() {
  resetDemoWorkflowState();
  seedDemoShiftPipelineState();
  demoShiftClaims.splice(0);
  const initialAuditCount = demoAuditLogs.length;
  const initialNotificationCount = demoNotifications.length;

  const permissions = new PermissionService();
  const eligibility = new ShiftEligibilityService();
  const repositories = new ShiftPipelineRepositoryProvider();
  const claims = new ShiftClaimService(permissions, eligibility, repositories);
  const manager = new ShiftManagerService(permissions, eligibility, repositories);

  const pending = await claims.claimOpenSlot(session("user_priya"), "slot_shift_open_icu_night");
  await manager.decidePendingClaim(session("user_jordan_manager"), pending.claim.id, "approve", "Audit assertion approval");

  assert.ok(demoAuditLogs.length >= initialAuditCount + 2);
  assert.ok(demoAuditLogs.some((log) => log.action === "shift_pipeline.claim.pending_approval"));
  assert.ok(demoAuditLogs.some((log) => log.action === "shift_pipeline.claim.approved"));
  assert.ok(demoNotifications.length >= initialNotificationCount + 2);
  assert.ok(demoNotifications.some((notification) => notification.type === "SHIFT_CLAIM_APPROVAL_REQUIRED"));
  assert.ok(demoNotifications.some((notification) => notification.type === "SHIFT_CLAIM_APPROVED"));
}

void run();
