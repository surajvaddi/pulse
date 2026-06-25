import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync(
  "src/workflows/shift-swap-eligibility.service.ts",
  "utf8"
);

assert.ok(service.includes("prisma.employeeProfile.findMany"));
assert.ok(service.includes("organizationId: session.organizationId"));
assert.ok(service.includes('certification.status === "VERIFIED"'));
assert.ok(service.includes("availabilityWindows"));
assert.ok(service.includes("shiftAssignments"));
assert.ok(service.includes("evaluateAssignmentCandidate"));

assert.ok(service.includes('process.env.WORKFLOW_PERSISTENCE === "prisma"'));
assert.ok(service.includes("this.operationalShifts(session.organizationId"));
