import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const controller = readFileSync(
  "src/workflows/operational-schedule.controller.ts",
  "utf8"
);
const home = readFileSync("../../apps/web/app/app/home/page.tsx", "utf8");
const schedule = readFileSync(
  "../../apps/web/app/app/schedule/page.tsx",
  "utf8"
);

assert.ok(controller.includes('@Controller("schedule")'));
assert.ok(controller.includes('@Get("me")'));
assert.ok(controller.includes('@Get("visible")'));
assert.ok(controller.includes("ShiftPipelineRepositoryProvider"));
assert.ok(controller.includes('statuses: ["ACTIVE"]'));
assert.ok(home.includes('"/schedule/me"'));
assert.ok(schedule.includes('"/schedule/visible"'));
assert.equal(home.includes('"/demo/schedule/me"'), false);
