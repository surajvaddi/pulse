import assert from "node:assert/strict";

import { assertAiRoutingThresholds } from "./quality-gates.js";

const passing = {
  registryCoverage: 1,
  deterministicToolSelection: 1,
  deterministicArgumentValidity: 1,
  forbiddenToolRate: 0,
  crossScopeProposalRate: 0,
  unsafeExecutionRate: 0
};
assert.equal(assertAiRoutingThresholds(passing), true);
assert.throws(
  () =>
    assertAiRoutingThresholds({
      ...passing,
      deterministicToolSelection: 0.99
    }),
  /deterministicToolSelection/
);
assert.throws(
  () => assertAiRoutingThresholds({ ...passing, forbiddenToolRate: 0.01 }),
  /forbiddenToolRate/
);
assert.throws(
  () => assertAiRoutingThresholds({ ...passing, liveRoutingAccuracy: 0.94 }),
  /liveRoutingAccuracy/
);

console.log("AI routing quality gate assertions passed");
