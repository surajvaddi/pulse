import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  OrganizationStructureBootstrapInputSchema,
  OrganizationStructureBootstrapResultSchema
} from "./onboarding-contracts";

const onboardingService = readFileSync("src/auth/onboarding.service.ts", "utf8");

assert.ok(onboardingService.includes("bootstrapOrganizationStructure"));
assert.ok(onboardingService.includes("onboarding.structure.created"));
assert.ok(onboardingService.includes("OrganizationStructureBootstrapInputSchema"));
assert.ok(onboardingService.includes("ORGANIZATION_OWNER"));
assert.ok(onboardingService.includes("onboardingRouteAfterStructure(session.role)"));
assert.equal(
  onboardingService
    .slice(
      onboardingService.indexOf("async createOrganizationForSupabaseUser"),
      onboardingService.indexOf("async bootstrapOrganizationStructure")
    )
    .includes("employeeProfile"),
  false
);

const input = OrganizationStructureBootstrapInputSchema.parse({
  facilityName: "North Campus",
  facilityTimezone: "America/Chicago",
  unitName: "Emergency Department",
  unitType: "ED"
});
assert.equal(input.unitType, "ED");

const result = OrganizationStructureBootstrapResultSchema.parse({
  facility: {
    id: "fac_test",
    organizationId: "org_test",
    name: input.facilityName,
    timezone: input.facilityTimezone,
    status: "ACTIVE"
  },
  unit: {
    id: "unit_test",
    facilityId: "fac_test",
    name: input.unitName,
    type: input.unitType,
    managerUserIds: ["user_owner"],
    active: true
  },
  nextStep: "/onboarding/preferences"
});
assert.equal(result.nextStep, "/onboarding/preferences");
