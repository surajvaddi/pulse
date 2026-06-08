import "reflect-metadata";

import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../app.module";

function encodePart(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function signToken(payload: Record<string, unknown>, secret: string) {
  const header = encodePart({ alg: "HS256", typ: "JWT" });
  const body = encodePart(payload);
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `${header}.${body}.${signature}`;
}

async function main() {
  const originalDemoAuth = process.env.ENABLE_DEMO_AUTH;
  const originalJwtSecret = process.env.SUPABASE_JWT_SECRET;
  process.env.ENABLE_DEMO_AUTH = "true";
  process.env.SUPABASE_JWT_SECRET = "test-supabase-secret";

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  try {
    const server = app.getHttpServer();

    const demoOnlySession = await request(server).get("/auth/me").expect(200);
    assert.equal(demoOnlySession.body.userId, "user_priya");

    const demoHeaderSession = await request(server)
      .get("/auth/me")
      .set("x-demo-user-id", "user_maya")
      .expect(200);
    assert.equal(demoHeaderSession.body.userId, "user_maya");

    const linkedToken = signToken(
      {
        sub: "supabase_user_maya",
        email: "maya.shah@example.com",
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      process.env.SUPABASE_JWT_SECRET
    );
    const bearerSession = await request(server)
      .get("/auth/me")
      .set("authorization", `Bearer ${linkedToken}`)
      .set("x-demo-user-id", "user_priya")
      .expect(200);
    assert.equal(bearerSession.body.userId, "user_maya");
    assert.notEqual(bearerSession.body.userId, "user_priya");

    const unknownToken = signToken(
      {
        sub: "supabase_user_new_account",
        email: "new.user@example.com",
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      process.env.SUPABASE_JWT_SECRET
    );
    await request(server)
      .get("/auth/me")
      .set("authorization", `Bearer ${unknownToken}`)
      .set("x-demo-user-id", "user_priya")
      .expect(401);
  } finally {
    await app.close();
    if (originalDemoAuth === undefined) {
      delete process.env.ENABLE_DEMO_AUTH;
    } else {
      process.env.ENABLE_DEMO_AUTH = originalDemoAuth;
    }
    if (originalJwtSecret === undefined) {
      delete process.env.SUPABASE_JWT_SECRET;
    } else {
      process.env.SUPABASE_JWT_SECRET = originalJwtSecret;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
