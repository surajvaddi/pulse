import "reflect-metadata";

import assert from "node:assert/strict";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../app.module";
import { redactHeaders, redactValue } from "./log-redaction";
import { requestIdHeader, safeRequestId } from "./request-context";
import { RequestLoggingService } from "./request-logging.service";

assert.equal(safeRequestId("req_test-123456"), true);
assert.equal(safeRequestId("short"), false);
assert.equal(safeRequestId("bad id with spaces"), false);
assert.deepEqual(redactHeaders({ authorization: "Bearer secret-token", cookie: "ps_access_token=secret" }), {
  authorization: "[REDACTED]",
  cookie: "[REDACTED]"
});
assert.deepEqual(redactValue({ prompt: "please select * from users where id = 1" }), {
  prompt: "please [REDACTED_SQL]"
});
assert.deepEqual(redactValue({ nested: { OPENAI_API_KEY: "sk-secret" } }), {
  nested: { OPENAI_API_KEY: "[REDACTED]" }
});

async function main() {
  const originalDemoAuth = process.env.ENABLE_DEMO_AUTH;
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  try {
    const server = app.getHttpServer();
    const logs = app.get(RequestLoggingService);
    logs.reset();

    const health = await request(server).get("/health").set(requestIdHeader, "req_test-123456").expect(200);
    assert.equal(health.headers[requestIdHeader], "req_test-123456");

    await new Promise((resolve) => setTimeout(resolve, 0));
    const healthLog = logs.list().find((record) => record.requestId === "req_test-123456");
    assert.ok(healthLog);
    assert.equal(healthLog.method, "GET");
    assert.equal(healthLog.path, "/health");
    assert.equal(healthLog.statusCode, 200);

    const authResponse = await request(server)
      .get("/auth/me")
      .set(requestIdHeader, "req_auth-123456")
      .set("x-demo-user-id", "user_priya")
      .expect(200);
    assert.equal(authResponse.headers[requestIdHeader], "req_auth-123456");

    await new Promise((resolve) => setTimeout(resolve, 0));
    const authLog = logs.list().find((record) => record.requestId === "req_auth-123456");
    assert.ok(authLog);
    assert.equal(authLog.actorUserId, "user_priya");
    assert.equal(authLog.actorRole, "EMPLOYEE");
    assert.equal(JSON.stringify(authLog.metadata).includes("secret-token"), false);
    assert.equal(JSON.stringify(authLog.metadata).includes("ps_access_token=secret"), false);

    process.env.ENABLE_DEMO_AUTH = "false";
    const denied = await request(server).get("/auth/me").set(requestIdHeader, "req_denied-123456").expect(401);
    assert.equal(denied.body.requestId, "req_denied-123456");
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
