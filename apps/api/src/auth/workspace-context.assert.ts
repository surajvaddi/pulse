import assert from "node:assert/strict";

import {
  permittedWorkspaceSelection,
  resolveWorkspaceScope
} from "./workspace-context.service";

const facilities = [
  { id: "fac_a", name: "A" },
  { id: "fac_b", name: "B" }
];
const units = [
  { id: "unit_a1", name: "A1", facilityId: "fac_a" },
  { id: "unit_a2", name: "A2", facilityId: "fac_a" },
  { id: "unit_b1", name: "B1", facilityId: "fac_b" }
];

const employee = resolveWorkspaceScope({
  organizationId: "org_1",
  scopes: [{ type: "SELF" }],
  facilities,
  units,
  employeeProfile: {
    primaryFacilityId: "fac_a",
    primaryUnitId: "unit_a2"
  }
});
assert.deepEqual(employee.facilities.map((facility) => facility.id), ["fac_a"]);
assert.deepEqual(employee.units.map((unit) => unit.id), ["unit_a2"]);

const manager = resolveWorkspaceScope({
  organizationId: "org_1",
  scopes: [{ type: "UNIT", unitIds: ["unit_b1"] }],
  facilities,
  units
});
assert.deepEqual(manager.facilities.map((facility) => facility.id), ["fac_b"]);
assert.deepEqual(manager.units.map((unit) => unit.id), ["unit_b1"]);

const owner = resolveWorkspaceScope({
  organizationId: "org_1",
  scopes: [{ type: "ORG", organizationId: "org_1" }],
  facilities,
  units
});
assert.equal(owner.facilities.length, 2);
assert.equal(owner.units.length, 3);

const wrongOrganization = resolveWorkspaceScope({
  organizationId: "org_1",
  scopes: [{ type: "ORG", organizationId: "org_2" }],
  facilities,
  units
});
assert.equal(wrongOrganization.facilities.length, 0);

assert.deepEqual(
  permittedWorkspaceSelection(owner, {
    facilityId: "fac_a",
    unitId: "unit_a2"
  }),
  { facilityId: "fac_a", unitId: "unit_a2" }
);
assert.equal(
  permittedWorkspaceSelection(manager, { unitId: "unit_a1" }),
  null
);
assert.equal(
  permittedWorkspaceSelection(owner, {
    facilityId: "fac_a",
    unitId: "unit_b1"
  }),
  null
);
