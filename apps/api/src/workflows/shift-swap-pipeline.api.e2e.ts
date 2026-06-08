import "reflect-metadata";

import assert from "node:assert/strict";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../app.module";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";

async function main() {
  seedDemoShiftPipelineState();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  try {
    const server = app.getHttpServer();
    const eligible = await request(server)
      .get("/swap-pipeline/eligible-original-shifts")
      .set("x-demo-user-id", "user_priya")
      .expect(200);
    assert.ok(eligible.body.some((shift: { slotId: string }) => shift.slotId === "slot_shift_priya_week2_icu_day"));

    const detail = await request(server)
      .get("/swap-pipeline/shifts/slot_shift_priya_week2_icu_day/eligibility")
      .set("x-demo-user-id", "user_priya")
      .expect(200);
    assert.equal(detail.body.decision.allowed, true);
    assert.equal(detail.body.originalShift.employeeId, "emp_priya");

    const candidates = await request(server)
      .get("/swap-pipeline/shifts/slot_shift_priya_week2_icu_day/candidates")
      .set("x-demo-user-id", "user_priya")
      .expect(200);
    const maya = candidates.body.find((candidate: { userId: string }) => candidate.userId === "user_maya");
    const priya = candidates.body.find((candidate: { userId: string }) => candidate.userId === "user_priya");
    const aria = candidates.body.find((candidate: { userId: string }) => candidate.userId === "user_aria_agency");
    assert.equal(maya.eligible, true);
    assert.equal(maya.requiresApproval, true);
    assert.equal(priya.eligible, false);
    assert.ok(priya.blockingReasons.includes("Candidate cannot be the requesting employee."));
    assert.equal(aria.eligible, false);
  } finally {
    await app.close();
  }
}

void main();
