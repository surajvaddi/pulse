import "reflect-metadata";

import { strict as assert } from "node:assert";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../app.module";
import { resetDemoWorkflowState } from "../demo/demo-data";

async function main() {
  resetDemoWorkflowState();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  const server = app.getHttpServer();

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

  const swapCreate = await request(server)
    .post("/workflows/swaps")
    .set("x-demo-user-id", "user_priya")
    .send({ originalShiftId: "shift_priya_friday_icu_night", proposedUserId: "user_maya" })
    .expect(201);
  assert.equal(swapCreate.body.status, "PENDING_COUNTERPARTY");

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

  await app.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
