import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const repository = readFileSync(
  "src/workflows/shift-swap.repository.ts",
  "utf8"
);
const service = readFileSync("src/workflows/shift-swap.service.ts", "utf8");

assert.ok(repository.includes("interface ShiftSwapRepository"));
assert.ok(repository.includes("class PrismaShiftSwapRepository"));
assert.ok(repository.includes("organizationId: input.organizationId"));
assert.ok(repository.includes("policyDecision"));
assert.ok(service.includes("decidePersistedSwap"));
assert.ok(service.includes('isolationLevel: "Serializable"'));
assert.ok(service.includes("competingAssignment"));
assert.ok(service.includes("P2034"));
