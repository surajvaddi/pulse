import assert from "node:assert/strict";

import { workspaceContextView } from "./workspace-context-view";

const owner = workspaceContextView({
  facilities: [
    { id: "fac_a", name: "A" },
    { id: "fac_b", name: "B" }
  ],
  units: [
    { id: "unit_a1", name: "A1", facilityId: "fac_a" },
    { id: "unit_a2", name: "A2", facilityId: "fac_a" }
  ],
  defaultSelection: { facilityId: "fac_a", unitId: "unit_a1" },
  activeSelection: { facilityId: "fac_a", unitId: "unit_a1" },
  roleGrants: []
});
assert.equal(owner.showFacilitySelector, true);
assert.equal(owner.showUnitSelector, true);

const employee = workspaceContextView({
  facilities: [{ id: "fac_a", name: "A" }],
  units: [{ id: "unit_a1", name: "A1", facilityId: "fac_a" }],
  defaultSelection: { facilityId: "fac_a", unitId: "unit_a1" },
  activeSelection: { facilityId: "fac_a", unitId: "unit_a1" },
  roleGrants: []
});
assert.equal(employee.showFacilitySelector, false);
assert.equal(employee.showUnitSelector, false);
assert.equal(employee.activeUnit?.name, "A1");

const empty = workspaceContextView({
  facilities: [],
  units: [],
  defaultSelection: {},
  activeSelection: {},
  roleGrants: []
});
assert.equal(empty.hasOptions, false);
