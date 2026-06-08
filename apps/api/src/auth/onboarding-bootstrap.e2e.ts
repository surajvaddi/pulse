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
  if (!process.env.DATABASE_URL) {
    console.log("Skipping onboarding bootstrap e2e because DATABASE_URL is not configured.");
    return;
  }

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
    const uniqueEmail = `onboarding.owner.${Date.now()}@example.com`;
    const token = signToken(
      {
        sub: `supabase_${Date.now()}`,
        email: uniqueEmail,
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      process.env.SUPABASE_JWT_SECRET
    );

    const created = await request(server)
      .post("/onboarding/organizations")
      .set("authorization", `Bearer ${token}`)
      .set("x-demo-user-id", "user_priya")
      .send({
        name: "Onboarding Test Hospital",
        timezone: "America/Chicago",
        displayName: "Onboarding Owner"
      })
      .expect(201);

    assert.equal(created.body.user.email, uniqueEmail);
    assert.equal(created.body.user.role, "ORGANIZATION_OWNER");

    const session = await request(server)
      .get("/auth/me")
      .set("authorization", `Bearer ${token}`)
      .set("x-demo-user-id", "user_priya")
      .expect(200);
    assert.equal(session.body.email, uniqueEmail);
    assert.notEqual(session.body.userId, "user_priya");
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
