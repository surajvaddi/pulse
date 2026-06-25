import assert from "node:assert/strict";

import {
  FixtureLlmGateway,
  providerFixtureProposal,
  type ProviderFixtureKind
} from "./eval-fixtures.js";

const kinds: ProviderFixtureKind[] = [
  "correct",
  "incorrect",
  "malformed",
  "multiple",
  "forbidden"
];
for (const kind of kinds) {
  assert.ok(providerFixtureProposal(kind).length > 0);
}
assert.equal(providerFixtureProposal("malformed")[0]?.argumentParseError, true);
assert.equal(providerFixtureProposal("multiple").length, 2);
assert.equal(providerFixtureProposal("forbidden")[0]?.riskLevel, "BLOCKED");
assert.ok(new FixtureLlmGateway("correct"));

console.log("provider proposal fixture assertions passed");
