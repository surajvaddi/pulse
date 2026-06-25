import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const swaps = readFileSync("app/app/swaps/page.tsx", "utf8");
const manager = readFileSync("app/app/manager/page.tsx", "utf8");
const actions = readFileSync("app/app/actions.ts", "utf8");

assert.ok(swaps.includes('session.permissions.includes("shift:swap:create")'));
assert.equal(swaps.includes("decideCanonicalSwapAction"), false);
assert.ok(swaps.includes("Pending manager review"));
assert.ok(manager.includes("decideCanonicalSwapAction"));
assert.ok(actions.includes(
  'apiPostSession(`/swap-pipeline/swaps/${swapId}/respond`'
));
assert.equal(actions.includes('?? "user_maya"'), false);
