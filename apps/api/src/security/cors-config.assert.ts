import "reflect-metadata";

import assert from "node:assert/strict";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../app.module";
import { allowedCorsOrigins, buildCorsOptions } from "./cors-config";

assert.deepEqual(allowedCorsOrigins({ NODE_ENV: "development" }), [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001"
]);
assert.deepEqual(allowedCorsOrigins({ WEB_ORIGINS: "https://staging.pulseshift.app, https://app.pulseshift.app" }), [
  "https://staging.pulseshift.app",
  "https://app.pulseshift.app"
]);
assert.throws(() => allowedCorsOrigins({ APP_ENV: "production", CORS_ALLOWED_ORIGINS: "*" }), /wildcard/);
assert.throws(() => allowedCorsOrigins({ APP_ENV: "production" }), /requires/);

async function main() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  app.enableCors(buildCorsOptions({ APP_ENV: "production", CORS_ALLOWED_ORIGINS: "https://app.pulseshift.test" }));
  await app.init();

  try {
    const server = app.getHttpServer();
    const allowedResponse = await request(server)
      .get("/health")
      .set("origin", "https://app.pulseshift.test")
      .expect(200);
    assert.equal(allowedResponse.headers["access-control-allow-origin"], "https://app.pulseshift.test");
    assert.equal(allowedResponse.headers["access-control-allow-credentials"], "true");

    const deniedResponse = await request(server)
      .get("/health")
      .set("origin", "https://evil.example")
      .expect(200);
    assert.equal(deniedResponse.headers["access-control-allow-origin"], undefined);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
