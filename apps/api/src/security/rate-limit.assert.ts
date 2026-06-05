import "reflect-metadata";

import assert from "node:assert/strict";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../app.module";
import type { DemoSession } from "../auth/demo-users";
import { classifyRateLimitCategory, policyFor, rateLimitKey, RateLimitService } from "./rate-limit.service";

assert.equal(classifyRateLimitCategory("GET", "/auth/me"), "auth_session");
assert.equal(classifyRateLimitCategory("POST", "/copilot/messages"), "copilot");
assert.equal(classifyRateLimitCategory("POST", "/swaps/swap_1/approve"), "workflow_write");
assert.equal(classifyRateLimitCategory("POST", "/integrations/abc/sync"), "integration");
assert.deepEqual(policyFor("copilot", { RATE_LIMIT_COPILOT_LIMIT: "2", RATE_LIMIT_COPILOT_WINDOW_MS: "5000" }), {
  limit: 2,
  windowMs: 5000
});

const service = new RateLimitService();
const fakeSession: DemoSession = {
  userId: "user_priya",
  organizationId: "org_pulseshift_demo",
  displayName: "Priya Raman",
  email: "priya.nurse@example.com",
  role: "EMPLOYEE",
  grants: []
};
const fakeRequest = {
  method: "POST",
  path: "/copilot/messages",
  ip: "127.0.0.1",
  socket: {},
  session: fakeSession
} as Parameters<RateLimitService["check"]>[0];

assert.ok(rateLimitKey(fakeRequest, "copilot").includes("user_priya"));
assert.equal(service.check(fakeRequest, 1_000, { RATE_LIMIT_COPILOT_LIMIT: "1" }).allowed, true);
assert.equal(service.check(fakeRequest, 1_100, { RATE_LIMIT_COPILOT_LIMIT: "1" }).allowed, false);
service.reset();
assert.equal(service.check(fakeRequest, 1_200, { RATE_LIMIT_COPILOT_LIMIT: "1" }).allowed, true);

async function main() {
  const originalLimit = process.env.RATE_LIMIT_COPILOT_LIMIT;
  const originalWindow = process.env.RATE_LIMIT_COPILOT_WINDOW_MS;
  process.env.RATE_LIMIT_COPILOT_LIMIT = "1";
  process.env.RATE_LIMIT_COPILOT_WINDOW_MS = "60000";

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  try {
    const server = app.getHttpServer();
    const limiter = app.get(RateLimitService);

    for (const userId of ["user_priya", "user_admin", "user_aria_agency", "user_ai_service"]) {
      limiter.reset();
      const allowed = await request(server)
        .post("/copilot/messages")
        .set("x-demo-user-id", userId)
        .send({ message: "Run direct SQL against the database." })
        .expect(201);
      assert.equal(allowed.headers["x-ratelimit-category"], "copilot");
      assert.equal(allowed.headers["x-ratelimit-limit"], "1");

      const denied = await request(server)
        .post("/copilot/messages")
        .set("x-demo-user-id", userId)
        .send({ message: "Run direct SQL against the database." })
        .expect(429);
      assert.equal(denied.body.message, "Too many requests");
      assert.equal(denied.body.category, "copilot");
    }
  } finally {
    await app.close();
    restoreEnv("RATE_LIMIT_COPILOT_LIMIT", originalLimit);
    restoreEnv("RATE_LIMIT_COPILOT_WINDOW_MS", originalWindow);
  }
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
