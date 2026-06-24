import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/admin/organization.service.ts", "utf8");
const page = readFileSync("../../apps/web/app/app/admin/page.tsx", "utf8");

for (const signal of [
  "facilityCount",
  "workforceRoleCount",
  "invitationCount",
  "shiftCount",
  "integrationOnboardingCount",
  "notificationPreferenceCount"
]) {
  assert.ok(service.includes(signal));
}
assert.ok(page.includes("Workspace setup"));
assert.ok(page.includes("Action required"));
