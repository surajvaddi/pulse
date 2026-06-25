import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/app/schedule/planning/page.tsx", "utf8");
const actions = readFileSync("app/app/actions.ts", "utf8");
const service = readFileSync(
  "../../apps/api/src/workflows/shift-creation.service.ts",
  "utf8"
);

assert.ok(page.includes("Create draft slot"));
assert.ok(page.includes("Expand requirement"));
assert.ok(page.includes("Confirm publish"));
assert.ok(page.includes("Lock finalized slots"));
assert.ok(actions.includes("/shift-pipeline/slots/draft"));
assert.ok(actions.includes("/shift-pipeline/slots/expand-requirement"));
assert.ok(actions.includes('confirmed: formData.get("confirmed") === "on"'));
assert.ok(service.includes("validateDraftSlots"));
assert.ok(service.includes("failures"));
