import assert from "node:assert/strict";

import { scopeQueryForSession } from "./scope-query";

const baseContext = {
  facilities: [{ id: "fac_a", name: "A" }],
  units: [{ id: "unit_a", name: "A", facilityId: "fac_a" }],
  defaultSelection: { facilityId: "fac_a", unitId: "unit_a" },
  activeSelection: { facilityId: "fac_a", unitId: "unit_a" },
  roleGrants: []
};

const employeeSession = {
  userId: "user_employee",
  organizationId: "org_1",
  displayName: "Employee",
  email: "employee@example.com",
  role: "EMPLOYEE" as const,
  grants: [{ permission: "schedule:read:self" as const, scope: { type: "SELF" as const } }]
};
assert.deepEqual(
  scopeQueryForSession(employeeSession, baseContext, "schedule"),
  {
    organizationId: "org_1",
    facilityId: "fac_a",
    unitId: "unit_a",
    userId: "user_employee"
  }
);

const managerSession = {
  ...employeeSession,
  role: "UNIT_MANAGER" as const,
  grants: [{
    permission: "schedule:read:unit" as const,
    scope: { type: "UNIT" as const, unitIds: ["unit_a"] }
  }]
};
assert.deepEqual(
  scopeQueryForSession(managerSession, baseContext, "staffing"),
  { organizationId: "org_1", facilityId: "fac_a", unitId: "unit_a" }
);

const ownerSession = {
  ...employeeSession,
  role: "ORGANIZATION_OWNER" as const,
  grants: [{
    permission: "schedule:read:facility" as const,
    scope: { type: "ORG" as const, organizationId: "org_1" }
  }]
};
assert.deepEqual(
  scopeQueryForSession(
    ownerSession,
    { ...baseContext, activeSelection: {} },
    "reports"
  ),
  { organizationId: "org_1" }
);
