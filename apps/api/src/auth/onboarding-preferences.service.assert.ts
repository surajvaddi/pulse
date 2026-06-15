import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  IntegrationsOnboardingInputSchema,
  IntegrationsOnboardingResultSchema,
  NotificationPreferencesOnboardingInputSchema,
  NotificationPreferencesOnboardingResultSchema
} from "./onboarding-contracts";

const onboardingService = readFileSync("src/auth/onboarding.service.ts", "utf8");
const onboardingController = readFileSync("src/auth/onboarding.controller.ts", "utf8");

assert.ok(onboardingService.includes("completeNotificationPreferences"));
assert.ok(onboardingService.includes("completeIntegrationsOnboarding"));
assert.ok(onboardingService.includes("onboarding.preferences.completed"));
assert.ok(onboardingService.includes("onboarding.integrations.completed"));
assert.ok(onboardingController.includes('"preferences"'));
assert.ok(onboardingController.includes('"integrations"'));

const preferencesInput = NotificationPreferencesOnboardingInputSchema.parse({
  phone: "+1 555 010 2000",
  emailAlertsEnabled: true,
  smsAlertsEnabled: false
});
assert.equal(preferencesInput.emailAlertsEnabled, true);

const preferencesResult = NotificationPreferencesOnboardingResultSchema.parse({
  nextStep: "/onboarding/integrations"
});
assert.equal(preferencesResult.nextStep, "/onboarding/integrations");

const integrationsInput = IntegrationsOnboardingInputSchema.parse({ action: "skip" });
assert.equal(integrationsInput.action, "skip");

const integrationsResult = IntegrationsOnboardingResultSchema.parse({
  nextStep: "/onboarding/organization"
});
assert.equal(integrationsResult.nextStep, "/onboarding/organization");
