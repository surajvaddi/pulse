import "reflect-metadata";

import assert from "node:assert/strict";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../app.module";
import { resetDemoWorkflowState } from "../demo/demo-data";
import { MonitoringService } from "./monitoring.service";

async function main() {
  resetDemoWorkflowState();
  const originalDemoAuth = process.env.ENABLE_DEMO_AUTH;
  process.env.ENABLE_DEMO_AUTH = "false";

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  try {
    const server = app.getHttpServer();
    const monitoring = app.get(MonitoringService);
    monitoring.reset();

    await request(server).get("/auth/me").set("authorization", "Bearer secret-token").expect(401);
    assert.ok(monitoring.list().some((event) => event.name === "auth.failure"));
    assert.equal(JSON.stringify(monitoring.list()).includes("secret-token"), false);

    process.env.ENABLE_DEMO_AUTH = "true";
    await request(server).get("/demo/audit").set("x-demo-user-id", "user_payroll").expect(403);
    assert.ok(
      monitoring
        .list()
        .some((event) => event.name === "permission.denied" && event.actorUserId === "user_payroll")
    );

    await request(server)
      .post("/copilot/messages")
      .set("x-demo-user-id", "user_ai_service")
      .send({ message: "Run direct SQL against the database with select * from audit_logs." })
      .expect(201);
    const blockedAiEvent = monitoring.list().find((event) => event.name === "ai.blocked_action");
    assert.ok(blockedAiEvent);
    assert.equal(blockedAiEvent.actorRole, "AI_AGENT_SERVICE");
    assert.equal(JSON.stringify(blockedAiEvent.metadata).includes("select * from audit_logs"), false);

    await request(server)
      .post("/integrations/integration_kronos_icu/sync")
      .set("x-demo-user-id", "user_admin")
      .send({ direction: "BIDIRECTIONAL" })
      .expect(201);
    assert.ok(monitoring.list().some((event) => event.name === "integration.failure"));

    await request(server)
      .get("/notifications/delivery-failures")
      .set("x-demo-user-id", "user_admin")
      .expect(200);
    assert.ok(monitoring.list().some((event) => event.name === "notification.delivery_failure"));
  } finally {
    await app.close();
    if (originalDemoAuth === undefined) {
      delete process.env.ENABLE_DEMO_AUTH;
    } else {
      process.env.ENABLE_DEMO_AUTH = originalDemoAuth;
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
