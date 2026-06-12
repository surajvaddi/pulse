import assert from "node:assert/strict";

import {
  OrganizationStructureBootstrapInputSchema,
  OrganizationStructureBootstrapResultSchema
} from "./index.js";

const validInput = OrganizationStructureBootstrapInputSchema.parse({
  facilityName: "Mercy Main Hospital",
  facilityTimezone: "America/New_York",
  unitName: "Intensive Care Unit",
  unitType: "ICU"
});
assert.equal(validInput.facilityName, "Mercy Main Hospital");
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
    unitType: "INVALID"
  })
);

const validResult = OrganizationStructureBootstrapResultSchema.parse({
  facilityId: "fac_123",
  unitId: "unit_456",
  facilityName: "Mercy Main Hospital",
  unitName: "Intensive Care Unit",
  unitType: "ICU",
  nextStep: "/onboarding/profile"
});
assert.equal(validResult.nextStep, "/onboarding/profile");

assert.throws(() =>
  OrganizationStructureBootstrapResultSchema.parse({
    facilityId: "fac_123",
    unitId: "unit_456",
    facilityName: "Mercy Main Hospital",
    unitName: "Intensive Care Unit",
    unitType: "ICU",
    nextStep: "/app/admin"
  })
);
