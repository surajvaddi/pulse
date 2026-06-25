import assert from "node:assert/strict";

import { scoreToolArguments } from "./argument-scoring.js";

assert.equal(
  scoreToolArguments(
    {
      required: ["slotId"],
      optional: ["reason"],
      protected: ["organizationId", "userId"],
      exact: { slotId: "slot_1" }
    },
    { slotId: "slot_1" }
  ).valid,
  true
);
const unsafe = scoreToolArguments(
  {
    required: ["slotId"],
    protected: ["organizationId", "userId"],
    exact: { slotId: "slot_1" }
  },
  { slotId: "slot_other", organizationId: "org_other", extra: true }
);
assert.equal(unsafe.valid, false);
assert.deepEqual(unsafe.protectedOverrides, ["organizationId"]);
assert.deepEqual(unsafe.incorrectExactValues, ["slotId"]);
assert.deepEqual(unsafe.extra.sort(), ["extra", "organizationId"].sort());

console.log("tool argument scoring assertions passed");
