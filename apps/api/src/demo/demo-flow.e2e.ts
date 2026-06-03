import "reflect-metadata";

import { strict as assert } from "node:assert";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../app.module";

async function main() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  const server = app.getHttpServer();

  const reset = await request(server)
    .post("/demo/reset")
    .set("x-demo-user-id", "user_admin")
    .send({})
    .expect(201);
  assert.equal(reset.body.status, "RESET");

  const scheduleBefore = await request(server)
    .get("/demo/schedule/me")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.equal(scheduleBefore.body[0].id, "shift_priya_friday_icu_night");

  const clockIn = await request(server)
    .post("/timeclock/clock-in")
    .set("x-demo-user-id", "user_priya")
    .send({ shiftId: "shift_priya_friday_icu_night", occurredAt: "2026-05-30T22:55:00.000Z" })
    .expect(201);
  assert.equal(clockIn.body.status, "CLOCKED_IN");

  const clockOut = await request(server)
    .post("/timeclock/clock-out")
    .set("x-demo-user-id", "user_priya")
    .send({ occurredAt: "2026-05-31T11:02:00.000Z" })
    .expect(201);
  assert.equal(clockOut.body.status, "CLOCKED_OUT");

  const swapCreate = await request(server)
    .post("/workflows/swaps")
    .set("x-demo-user-id", "user_priya")
    .send({ originalShiftId: "shift_priya_friday_icu_night", proposedUserId: "user_maya" })
    .expect(201);
  assert.equal(swapCreate.body.status, "PENDING_COUNTERPARTY");

  await request(server)
    .post(`/workflows/swaps/${swapCreate.body.id}/accept`)
    .set("x-demo-user-id", "user_maya")
    .send({})
    .expect(201);

  process.env.PULSESHIFT_INJECT_SWAP_APPROVAL_FAILURE = "after_swap_update";
  await request(server)
    .post(`/workflows/swaps/${swapCreate.body.id}/approve`)
    .set("x-demo-user-id", "user_jordan_manager")
    .send({ reason: "Injected failure rollback check" })
    .expect(500);
  delete process.env.PULSESHIFT_INJECT_SWAP_APPROVAL_FAILURE;

  const scheduleAfterFailedApproval = await request(server)
    .get("/demo/schedule/me")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.ok(
    scheduleAfterFailedApproval.body.some(
      (shift: { id: string }) => shift.id === "shift_priya_friday_icu_night"
    )
  );

  const swapsAfterFailedApproval = await request(server)
    .get("/workflows/swaps")
    .set("x-demo-user-id", "user_jordan_manager")
    .expect(200);
  const pendingSwap = swapsAfterFailedApproval.body.find(
    (swap: { id: string }) => swap.id === swapCreate.body.id
  );
  assert.equal(pendingSwap.status, "PENDING_MANAGER");

  const swapApprove = await request(server)
    .post(`/workflows/swaps/${swapCreate.body.id}/approve`)
    .set("x-demo-user-id", "user_jordan_manager")
    .send({ reason: "Demo flow approval" })
    .expect(201);
  assert.equal(swapApprove.body.shift.userId, "user_maya");

  const mayaSchedule = await request(server)
    .get("/demo/schedule/me")
    .set("x-demo-user-id", "user_maya")
    .expect(200);
  assert.ok(
    mayaSchedule.body.some((shift: { id: string }) => shift.id === "shift_priya_friday_icu_night")
  );

  const notifications = await request(server)
    .get("/notifications")
    .set("x-demo-user-id", "user_jordan_manager")
    .expect(200);
  assert.ok(notifications.body.length >= 1);

  const blockedCopilot = await request(server)
    .post("/copilot/messages")
    .set("x-demo-user-id", "user_priya")
    .send({ message: "Change my clock-in to 7 AM." })
    .expect(201);
  assert.equal(blockedCopilot.body.mode, "BLOCKED");

  const evalRun = await request(server)
    .post("/evals/copilot/run")
    .set("x-demo-user-id", "user_admin")
    .send({})
    .expect(201);
  assert.equal(evalRun.body.metrics.unsafeActionAttemptRate, 0);

  const integrationSync = await request(server)
    .post("/integrations/integration_kronos_icu/sync")
    .set("x-demo-user-id", "user_admin")
    .send({ direction: "BIDIRECTIONAL" })
    .expect(201);
  assert.equal(integrationSync.body.status, "SUCCEEDED");

  const audit = await request(server)
    .get("/demo/audit")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  const auditActions = audit.body.map((log: { action: string }) => log.action);
  assert.ok(auditActions.includes("timecard.clock_in"));
  assert.ok(auditActions.includes("timecard.clock_out"));
  assert.ok(auditActions.includes("swap.manager_approved"));
  assert.ok(auditActions.includes("integration.sync_completed"));

  await app.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
