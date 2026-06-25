import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "src/workflows/copilot-activity.service.ts",
  "utf8"
);
for (const required of [
  "organizationId: session.organizationId",
  "userId: session.userId",
  "aIConversation.create",
  "aIMessage.create",
  "aIToolCall.create",
  'orderBy: { createdAt: "desc" }'
]) {
  assert.ok(source.includes(required), required);
}

console.log("Copilot activity persistence assertions passed");
