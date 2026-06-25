import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const claimService = readFileSync(
  "src/workflows/shift-claim.service.ts",
  "utf8"
);
const managerService = readFileSync(
  "src/workflows/shift-manager.service.ts",
  "utf8"
);
const controller = readFileSync(
  "src/workflows/shift-pipeline.controller.ts",
  "utf8"
);

assert.ok(claimService.includes("createPersistedApprovalClaim"));
assert.ok(claimService.includes('isolationLevel: "Serializable"'));
assert.ok(claimService.includes("approvalRequest.create"));
assert.ok(claimService.includes("notification.create"));
assert.ok(claimService.includes("auditLog.create"));
assert.ok(managerService.includes("decidePersistedClaim"));
assert.ok(managerService.includes("shiftAssignment.create"));
assert.ok(managerService.includes("P2034"));
assert.ok(controller.includes("prisma.approvalRequest.findMany"));
