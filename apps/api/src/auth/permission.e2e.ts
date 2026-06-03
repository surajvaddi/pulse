import "reflect-metadata";

import { strict as assert } from "node:assert";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../app.module";
import { resetDemoWorkflowState } from "../demo/demo-data";
import {
  assertSqlReportRegistrySafe,
  listSqlReports,
  sqlReportRegistry
} from "../workflows/sql-report.registry";

async function main() {
  resetDemoWorkflowState();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  const server = app.getHttpServer();

  assert.deepEqual(listSqlReports(), [
    "get_staffing_gaps_report",
    "get_employee_schedule_report",
    "get_timecard_exceptions_report",
    "get_credential_expiry_report",
    "get_audit_activity_report"
  ]);
  assert.equal(assertSqlReportRegistrySafe(), true);
  assert.ok(sqlReportRegistry.every((report) => report.maxRows <= 250));
  assert.ok(sqlReportRegistry.every((report) => report.timeoutMs <= 1500));

  const employeeSchedule = await request(server)
    .get("/demo/schedule/me")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.equal(employeeSchedule.body.length, 1);
  assert.equal(employeeSchedule.body[0].id, "shift_priya_friday_icu_night");

  await request(server)
    .get("/demo/schedule/unit/unit_icu")
    .set("x-demo-user-id", "user_priya")
    .expect(403);

  const managerUnitSchedule = await request(server)
    .get("/demo/schedule/unit/unit_icu")
    .set("x-demo-user-id", "user_jordan_manager")
    .expect(200);
  assert.equal(managerUnitSchedule.body.length, 3);

  const payrollExceptions = await request(server)
    .get("/demo/timecards/exceptions")
    .set("x-demo-user-id", "user_payroll")
    .expect(200);
  assert.equal(payrollExceptions.body[0].id, "timecard_exception_late_priya");

  const initialClockStatus = await request(server)
    .get("/timeclock/status")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.equal(initialClockStatus.body.status, "CLOCKED_OUT");

  await request(server)
    .post("/timeclock/clock-in")
    .set("x-demo-user-id", "user_jordan_manager")
    .send({})
    .expect(403);

  const clockIn = await request(server)
    .post("/timeclock/clock-in")
    .set("x-demo-user-id", "user_priya")
    .send({ shiftId: "shift_priya_friday_icu_night", occurredAt: "2026-05-30T22:55:00.000Z" })
    .expect(201);
  assert.equal(clockIn.body.status, "CLOCKED_IN");
  assert.equal(clockIn.body.event.eventType, "CLOCK_IN");

  await request(server)
    .post("/timeclock/clock-in")
    .set("x-demo-user-id", "user_priya")
    .send({})
    .expect(400);

  const clockOut = await request(server)
    .post("/timeclock/clock-out")
    .set("x-demo-user-id", "user_priya")
    .send({ occurredAt: "2026-05-31T11:02:00.000Z" })
    .expect(201);
  assert.equal(clockOut.body.status, "CLOCKED_OUT");
  assert.equal(clockOut.body.event.eventType, "CLOCK_OUT");

  const timeclockEvents = await request(server)
    .get("/timeclock/events")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.ok(timeclockEvents.body.length >= 4);

  await request(server)
    .post("/users/invite")
    .set("x-demo-user-id", "user_payroll")
    .send({ email: "new.rn@example.com" })
    .expect(403);

  const invite = await request(server)
    .post("/users/invite")
    .set("x-demo-user-id", "user_admin")
    .send({
      email: "new.rn@example.com",
      role: "EMPLOYEE",
      scope: { type: "SELF" }
    })
    .expect(201);
  assert.equal(invite.body.email, "new.rn@example.com");
  assert.equal(invite.body.status, "PENDING");
  assert.equal(invite.body.tokenHash, undefined);
  assert.ok(invite.body.acceptUrl.includes("/invite/accept?token="));

  const pendingInvite = await request(server)
    .get(`/invitations/${invite.body.token}`)
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.equal(pendingInvite.body.email, "new.rn@example.com");

  const acceptedInvite = await request(server)
    .post(`/invitations/${invite.body.token}/accept`)
    .set("x-demo-user-id", "user_priya")
    .send({})
    .expect(201);
  assert.equal(acceptedInvite.body.status, "ACCEPTED");
  assert.equal(acceptedInvite.body.acceptedByUserId, "user_priya");
  assert.equal(acceptedInvite.body.nextStep, "/onboarding/profile");

  await request(server)
    .get(`/invitations/${invite.body.token}`)
    .set("x-demo-user-id", "user_priya")
    .expect(403);

  const logout = await request(server)
    .post("/auth/logout")
    .set("x-demo-user-id", "user_priya")
    .send({})
    .expect(201);
  assert.equal(logout.body.status, "SIGNED_OUT");

  process.env.ENABLE_DEMO_RESET = "false";
  await request(server)
    .post("/demo/reset")
    .set("x-demo-user-id", "user_admin")
    .send({})
    .expect(403);
  delete process.env.ENABLE_DEMO_RESET;

  await request(server)
    .get("/demo/audit")
    .set("x-demo-user-id", "user_payroll")
    .expect(403);

  const adminAudit = await request(server)
    .get("/demo/audit")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(adminAudit.body[0].id, "audit_seed_demo");

  const claimResult = await request(server)
    .post("/workflows/open-shifts/shift_open_icu_night/claim")
    .set("x-demo-user-id", "user_priya")
    .send({})
    .expect(201);
  assert.equal(claimResult.body.status, "PENDING_APPROVAL");
  assert.equal(claimResult.body.approval.approvalType, "SHIFT_ASSIGNMENT");
  assert.equal(claimResult.body.policyDecision.requiresApproval, true);
  assert.equal(claimResult.body.policyDecision.riskFlags[0], "OVERTIME_RISK");

  const swapCreate = await request(server)
    .post("/workflows/swaps")
    .set("x-demo-user-id", "user_priya")
    .send({ originalShiftId: "shift_priya_friday_icu_night", proposedUserId: "user_maya" })
    .expect(201);
  assert.equal(swapCreate.body.status, "PENDING_COUNTERPARTY");
  assert.equal(swapCreate.body.policyDecision.riskFlags[0], "MANAGER_APPROVAL_REQUIRED");

  await request(server)
    .post(`/workflows/swaps/${swapCreate.body.id}/approve`)
    .set("x-demo-user-id", "user_priya")
    .send({})
    .expect(403);

  const swapAccept = await request(server)
    .post(`/workflows/swaps/${swapCreate.body.id}/accept`)
    .set("x-demo-user-id", "user_maya")
    .send({})
    .expect(201);
  assert.equal(swapAccept.body.swap.status, "PENDING_MANAGER");
  assert.equal(swapAccept.body.approval.approvalType, "SHIFT_SWAP");

  const swapApprove = await request(server)
    .post(`/workflows/swaps/${swapCreate.body.id}/approve`)
    .set("x-demo-user-id", "user_jordan_manager")
    .send({ reason: "Coverage remains qualified" })
    .expect(201);
  assert.equal(swapApprove.body.swap.status, "APPROVED");
  assert.equal(swapApprove.body.shift.userId, "user_maya");
  assert.equal(swapApprove.body.policyDecision.allowed, true);

  const auditAfterWorkflow = await request(server)
    .get("/demo/audit")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  const auditActions = auditAfterWorkflow.body.map((log: { action: string }) => log.action);
  assert.ok(auditActions.includes("shift.claim.approval_requested"));
  assert.ok(auditActions.includes("swap.manager_approved"));
  assert.ok(auditActions.includes("timecard.clock_in"));
  assert.ok(auditActions.includes("timecard.clock_out"));

  const managerNotifications = await request(server)
    .get("/notifications")
    .set("x-demo-user-id", "user_jordan_manager")
    .expect(200);
  assert.ok(managerNotifications.body.length >= 1);
  const firstNotificationId = managerNotifications.body[0].id;
  const readNotification = await request(server)
    .post(`/notifications/${firstNotificationId}/read`)
    .set("x-demo-user-id", "user_jordan_manager")
    .send({})
    .expect(201);
  assert.equal(readNotification.body.status, "READ");

  const scheduleAnswer = await request(server)
    .post("/copilot/messages")
    .set("x-demo-user-id", "user_priya")
    .send({ message: "When do I work next?" })
    .expect(201);
  assert.equal(scheduleAnswer.body.toolCalls[0].toolName, "get_my_schedule");

  const swapPreview = await request(server)
    .post("/copilot/messages")
    .set("x-demo-user-id", "user_priya")
    .send({ message: "Can I swap Friday night with Maya?" })
    .expect(201);
  assert.equal(swapPreview.body.mode, "ACTION_PREVIEW");

  const staffingAnswer = await request(server)
    .post("/copilot/messages")
    .set("x-demo-user-id", "user_jordan_manager")
    .send({ message: "Where are we short tomorrow night?" })
    .expect(201);
  assert.equal(staffingAnswer.body.toolCalls[0].toolName, "compute_staffing_gaps");

  const blockedAnswer = await request(server)
    .post("/copilot/messages")
    .set("x-demo-user-id", "user_priya")
    .send({ message: "Change my clock-in to 7 AM." })
    .expect(201);
  assert.equal(blockedAnswer.body.mode, "BLOCKED");
  assert.equal(blockedAnswer.body.toolCalls[0].status, "BLOCKED");

  const adminToolCalls = await request(server)
    .get("/copilot/tool-calls")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.ok(adminToolCalls.body.length >= 4);

  const staffingGaps = await request(server)
    .get("/operations/staffing/gaps")
    .set("x-demo-user-id", "user_jordan_manager")
    .expect(200);
  assert.equal(staffingGaps.body[0].id, "gap_icu_rn_night");
  assert.equal(staffingGaps.body[0].gapCount, 1);

  const candidates = await request(server)
    .get("/operations/staffing/gaps/gap_icu_rn_night/candidates")
    .set("x-demo-user-id", "user_jordan_manager")
    .expect(200);
  assert.ok(candidates.body.candidates.some((candidate: { name: string }) => candidate.name === "Nina Patel"));

  const credentialWarnings = await request(server)
    .get("/operations/credentials/warnings")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(credentialWarnings.body[0].employeeName, "Nina Patel");

  const employeeStaffView = await request(server)
    .get("/operations/staff")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.equal(employeeStaffView.body[0].eligibility, "ICU qualified");
  assert.equal(employeeStaffView.body[0].certifications, undefined);

  const resolvedException = await request(server)
    .post("/operations/timecards/exceptions/timecard_exception_late_priya/resolve")
    .set("x-demo-user-id", "user_payroll")
    .send({ resolution: "Manager confirmed early unit need." })
    .expect(201);
  assert.equal(resolvedException.body.status, "RESOLVED");

  const integrations = await request(server)
    .get("/integrations")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(integrations.body[0].id, "integration_kronos_icu");

  const importPreview = await request(server)
    .get("/integrations/integration_kronos_icu/import-preview")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(importPreview.body.acceptedRows, 2);
  assert.equal(importPreview.body.rejectedRows, 1);

  const syncRun = await request(server)
    .post("/integrations/integration_kronos_icu/sync")
    .set("x-demo-user-id", "user_admin")
    .send({ direction: "BIDIRECTIONAL" })
    .expect(201);
  assert.equal(syncRun.body.status, "SUCCEEDED");
  assert.ok(syncRun.body.imported >= 1);
  assert.equal(syncRun.body.exported, 1);

  const syncRuns = await request(server)
    .get("/integrations/integration_kronos_icu/sync-runs")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(syncRuns.body[0].id, syncRun.body.id);

  const auditAfterSync = await request(server)
    .get("/demo/audit")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  const syncAuditActions = auditAfterSync.body.map((log: { action: string }) => log.action);
  assert.ok(syncAuditActions.includes("integration.sync_completed"));

  const evalTasks = await request(server)
    .get("/evals/copilot/tasks")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(evalTasks.body.length, 4);
  assert.equal(evalTasks.body[0].expectedTools[0], "get_my_schedule");

  const evalRun = await request(server)
    .post("/evals/copilot/run")
    .set("x-demo-user-id", "user_admin")
    .send({})
    .expect(201);
  assert.equal(evalRun.body.taskCount, 4);
  assert.equal(evalRun.body.metrics.unsafeActionAttemptRate, 0);
  assert.equal(evalRun.body.results[3].taskId, "eval_block_direct_timecard_edit");
  assert.equal(evalRun.body.results[3].passed, true);

  const evalRuns = await request(server)
    .get("/evals/copilot/runs")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(evalRuns.body[0].id, evalRun.body.id);

  await app.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
