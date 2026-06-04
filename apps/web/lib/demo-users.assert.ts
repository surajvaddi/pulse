import assert from "node:assert/strict";

import { demoUsers, type DemoUserId } from "@/lib/api";

const ids = demoUsers.map((user) => user.id);
assert.equal(new Set(ids).size, ids.length);

const expectedIds: DemoUserId[] = [
  "user_owner",
  "user_admin",
  "user_wendy_workforce",
  "user_jordan_manager",
  "user_olivia_charge",
  "user_priya",
  "user_maya",
  "user_felix_float",
  "user_payroll",
  "user_carmen_credentials",
  "user_avery_auditor",
  "user_evan_exec",
  "user_aria_agency",
  "user_ai_service"
];

for (const expectedId of expectedIds) {
  assert.ok(ids.includes(expectedId), `Missing demo selector persona ${expectedId}`);
}
