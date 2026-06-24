import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const integrations = readFileSync("src/demo/integration.repository.ts", "utf8");
const evals = readFileSync("src/demo/eval.repository.ts", "utf8");

assert.equal(
  integrations.includes(
    "PrismaIntegrationRepository extends InMemoryIntegrationRepository"
  ),
  false
);
assert.equal(
  evals.includes("PrismaEvalRepository extends InMemoryEvalRepository"),
  false
);
assert.ok(integrations.includes("integrationConnectionRecord.findMany"));
assert.ok(integrations.includes("organizationId: query.organizationId"));
assert.ok(evals.includes("evaluationRunRecord.findMany"));
assert.ok(evals.includes("organizationId: query.organizationId"));
