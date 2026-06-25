import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { answerFromToolResult } from "./copilot.service";

assert.match(answerFromToolResult("get_my_schedule", []), /No records/);
assert.match(
  answerFromToolResult("get_my_schedule", [{ id: "shift_real" }]),
  /shift_real/
);
const source = readFileSync("src/demo/copilot.service.ts", "utf8");
for (const seededText of [
  "Priya",
  "Maya",
  "Jordan",
  "Nina",
  "Mercy",
  "unit_icu",
  "fac_mercy"
]) {
  assert.equal(source.includes(seededText), false, seededText);
}

console.log("Copilot grounding assertions passed");
