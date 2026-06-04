import assert from "node:assert/strict";

import { workflowExplanationForRoute } from "@/lib/workflow-explanations";

const employeeHome = workflowExplanationForRoute("/app/home", "EMPLOYEE");
assert.equal(employeeHome.title, "Employee self-service");
assert.ok(employeeHome.summary.includes("view next shift"));
assert.ok(employeeHome.scope.includes("self scope"));

const adminOverview = workflowExplanationForRoute("/app/admin", "SYSTEM_ADMIN");
assert.equal(adminOverview.title, "System administration");
assert.ok(adminOverview.summary.includes("review admin health"));
assert.ok(adminOverview.scope.includes("admin"));

const unknownRole = workflowExplanationForRoute("/app/schedule", "CUSTOM_ROLE");
assert.equal(unknownRole.title, "CUSTOM ROLE");
