import assert from "node:assert/strict";

import { scoreConfusionCase, toolConfusionCases } from "./confusion-pairs.js";

for (const item of toolConfusionCases) {
  assert.equal(scoreConfusionCase(item, [item.expectedTool]).passed, true);
  assert.equal(
    scoreConfusionCase(item, [item.expectedTool, item.confusableTools[0] ?? ""])
      .passed,
    false
  );
}

console.log("tool confusion pair assertions passed");
