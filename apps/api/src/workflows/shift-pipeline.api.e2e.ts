import "reflect-metadata";

import assert from "node:assert/strict";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../app.module";
import { demoApprovals } from "../demo/demo-data";
import { demoShiftClaims } from "./shift-pipeline.repository";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";

async function main() {
  seedDemoShiftPipelineState();
  demoApprovals.splice(0);
  demoShiftClaims.splice(0);

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  try {
    const server = app.getHttpServer();

    const slots = await request(server)
      .get("/shift-pipeline/slots?statuses=OPEN")
      .set("x-demo-user-id", "user_priya")
      .expect(200);
    assert.ok(slots.body.some((slot: { id: string }) => slot.id === "slot_shift_open_icu_night"));

    const pendingClaim = await request(server)
      .post("/shift-pipeline/slots/slot_shift_open_icu_night/claim")
      .set("x-demo-user-id", "user_priya")
      .expect(201);
    assert.equal(pendingClaim.body.status, "PENDING_APPROVAL");
    assert.equal(pendingClaim.body.claim.status, "PENDING_APPROVAL");

    const pendingApprovals = await request(server)
      .get("/shift-pipeline/approvals?status=PENDING")
      .set("x-demo-user-id", "user_jordan_manager")
      .expect(200);
    assert.equal(pendingApprovals.body.length, 1);

    const approvedClaim = await request(server)
      .post(`/shift-pipeline/claims/${pendingClaim.body.claim.id}/approve`)
      .set("x-demo-user-id", "user_jordan_manager")
      .send({ reason: "API e2e approval" })
      .expect(201);
    assert.equal(approvedClaim.body.status, "ASSIGNED");
    assert.equal(approvedClaim.body.claim.status, "ASSIGNED");

    seedDemoShiftPipelineState();
    demoApprovals.splice(0);
    demoShiftClaims.splice(0);

    const directAssignment = await request(server)
      .post("/shift-pipeline/slots/slot_shift_open_icu_week3/assign")
      .set("x-demo-user-id", "user_jordan_manager")
      .send({ userId: "user_maya" })
      .expect(201);
    assert.equal(directAssignment.body.status, "ASSIGNED");
    assert.equal(directAssignment.body.assignment.employeeId, "emp_maya");

    await request(server)
      .post("/shift-pipeline/slots/slot_shift_open_ed_day_week2/assign")
      .set("x-demo-user-id", "user_jordan_manager")
      .send({ userId: "user_aria_agency" })
      .expect(400);
  } finally {
    await app.close();
  }
}

void main();
