import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { InvitationWorkforceAssignmentSchema } from "@pulseshift/domain";

const invitationService = readFileSync("src/auth/invitation.service.ts", "utf8");
const onboardingService = readFileSync("src/auth/onboarding.service.ts", "utf8");
const profilePage = readFileSync("../../apps/web/app/onboarding/profile/page.tsx", "utf8");

const assignment = InvitationWorkforceAssignmentSchema.parse({
  facilityId: "facility_main",
  unitId: "unit_icu",
  workforceRoleId: "role_rn",
  employmentType: "FULL_TIME",
  employeeNumberPolicy: "AUTO"
});
assert.equal(assignment.employeeNumberPolicy, "AUTO");

assert.ok(invitationService.includes("validateWorkforceAssignment"));
assert.ok(invitationService.includes("facility: { organizationId }"));
assert.ok(invitationService.includes("workforceRole.findFirst"));
assert.ok(invitationService.includes("Employee number"));

assert.ok(onboardingService.includes("acceptedByUserId: session.userId"));
assert.ok(onboardingService.includes("controlled by the accepted invitation"));
assert.ok(onboardingService.includes("already in use. Ask an administrator"));
assert.ok(onboardingService.includes("unit.facilityId !== facility.id"));
assert.ok(onboardingService.includes(
  "Invitation workforce placement no longer belongs to the current organization."
));
assert.equal(onboardingService.includes('roleName?.trim() || "RN"'), false);

assert.ok(profilePage.includes("Organization-assigned workforce details"));
assert.equal(profilePage.includes('name="facilityId"'), false);
assert.equal(profilePage.includes('name="unitId"'), false);
assert.equal(profilePage.includes('name="employmentType"'), false);
assert.ok(profilePage.includes("Organization-assigned workforce details"));
