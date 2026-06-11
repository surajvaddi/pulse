import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { OrganizationStructureBootstrapResultSchema } from "./onboarding-contracts";

const onboardingService = readFileSync("src/auth/onboarding.service.ts", "utf8");

assert.ok(onboardingService.includes("bootstrapOrganizationStructure"));
assert.ok(onboardingService.includes("onboarding.structure.created"));
assert.ok(onboardingService.includes('nextStep: "/onboarding/structure"'));

const parsed = OrganizationStructureBootstrapResultSchema.parse({
  facility: {
    id: "fac_1",
    organizationId: "org_1",
    name: "North Campus",
    timezone: "America/Chicago",
    status: "ACTIVE"
  },
  unit: {
    id: "unit_1",
    facilityId: "fac_1",
    name: "Emergency Department",
    type: "ED",
    managerUserIds: ["user_owner"],
    active: true
  },
  nextStep: "/onboarding/profile"
});
assert.equal(parsed.unit.type, "ED");
