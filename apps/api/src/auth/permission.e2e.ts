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

  await app.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

