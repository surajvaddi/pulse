import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync("app/app/actions.ts", "utf8");
const home = readFileSync("app/app/home/page.tsx", "utf8");
const schedule = readFileSync(
  "app/app/schedule/schedule-workspace.tsx",
  "utf8"
);
const swaps = readFileSync("app/app/swaps/page.tsx", "utf8");

assert.ok(actions.includes('apiPostSession("/swap-pipeline/swaps"'));
assert.equal(actions.includes('"/workflows/swaps"'), false);
assert.ok(home.includes("/app/swaps?slotId="));
assert.ok(schedule.includes("/app/swaps?slotId="));
assert.ok(swaps.includes("left.slotId === slotId"));
assert.equal(swaps.includes('name="requesterUserId"'), false);
