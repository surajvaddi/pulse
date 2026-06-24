import assert from "node:assert/strict";

import {
  OrganizationStructureBootstrapInputSchema,
  OrganizationStructureBootstrapResultSchema
} from "./onboarding-contracts";

const validInput = OrganizationStructureBootstrapInputSchema.parse({
  facilityName: "Mercy Main Hospital",
  facilityTimezone: "America/New_York",
  unitName: "Intensive Care Unit",
  unitType: "ICU"
});
assert.equal(validInput.unitType, "ICU");

assert.throws(() =>
  OrganizationStructureBootstrapInputSchema.parse({
    facilityName: "",
    facilityTimezone: "America/New_York",
    unitName: "ICU",
    unitType: "ICU"
  })
);

assert.throws(() =>
  OrganizationStructureBootstrapInputSchema.parse({
    facilityName: "Mercy Main",
    facilityTimezone: "America/New_York",
    unitName: "ICU",
    unitType: "NOT_A_UNIT"
  })
);

const validResult = OrganizationStructureBootstrapResultSchema.parse({
  facility: {
    id: "fac_1",
    organizationId: "org_1",
    name: "Mercy Main Hospital",
    timezone: "America/New_York",
    status: "ACTIVE"
  },
  unit: {
    id: "unit_1",
    facilityId: "fac_1",
    name: "Intensive Care Unit",
    type: "ICU",
    managerUserIds: [],
    active: true
  },
  nextStep: "/onboarding/preferences"
});
assert.equal(validResult.nextStep, "/onboarding/preferences");
