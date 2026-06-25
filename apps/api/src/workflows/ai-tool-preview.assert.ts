import assert from "node:assert/strict";

import { demoSessions } from "../auth/demo-users";
import { assertPreviewConfirmable } from "./ai-tool-preview.service";

const employee = demoSessions.find((session) => session.role === "EMPLOYEE");
const manager = demoSessions.find((session) => session.role === "UNIT_MANAGER");
const aiAgent = demoSessions.find((session) => session.role === "AI_AGENT_SERVICE");
assert.ok(employee);
assert.ok(manager);
assert.ok(aiAgent);
const pending = {
  actorUserId: employee.userId,
  status: "PENDING",
  expiresAt: new Date(Date.now() + 60_000),
  targetVersion: "v1"
};
assert.doesNotThrow(() =>
  assertPreviewConfirmable(pending, employee, "v1")
);
assert.throws(() => assertPreviewConfirmable(pending, manager, "v1"), /creator/);
assert.throws(
  () =>
    assertPreviewConfirmable(
      { ...pending, actorUserId: aiAgent.userId },
      aiAgent,
      "v1"
    ),
  /AI service/
);
assert.throws(
  () => assertPreviewConfirmable({ ...pending, status: "EXECUTED" }, employee, "v1"),
  /already/
);
assert.throws(
  () =>
    assertPreviewConfirmable(
      { ...pending, expiresAt: new Date(Date.now() - 1) },
      employee,
      "v1"
    ),
  /expired/
);
assert.throws(() => assertPreviewConfirmable(pending, employee, "v2"), /changed/);

console.log("AI tool preview assertions passed");
