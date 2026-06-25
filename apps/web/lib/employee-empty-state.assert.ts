import assert from "node:assert/strict";

import {
  employeeEmptyState,
  type EmployeeEmptyStateKind
} from "./employee-empty-state";

const kinds: EmployeeEmptyStateKind[] = [
  "INCOMPLETE_PROFILE",
  "NO_SCHEDULE",
  "NO_AVAILABLE_SHIFTS",
  "NO_PERMISSION",
  "POLICY_BLOCK",
  "SERVICE_FAILURE"
];

for (const kind of kinds) {
  const state = employeeEmptyState(kind);
  assert.ok(state.title);
  assert.ok(state.message);
  assert.ok(state.actionLabel);
  assert.ok(state.actionHref.startsWith("/"));
}
assert.equal(employeeEmptyState("NO_SCHEDULE").actionHref, "/app/open-shifts");
assert.match(employeeEmptyState("POLICY_BLOCK").message, /qualification/);

console.log("employee empty state assertions passed");
