import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const middleware = readFileSync("src/auth/demo-auth.middleware.ts", "utf8");
const authModule = readFileSync("src/auth/auth.module.ts", "utf8");
const onboardingController = readFileSync("src/auth/onboarding.controller.ts", "utf8");
const onboardingService = readFileSync("src/auth/onboarding.service.ts", "utf8");
const shiftPipelineController = readFileSync("src/workflows/shift-pipeline.controller.ts", "utf8");
const webActions = readFileSync("../../apps/web/app/app/actions.ts", "utf8");
const accountActions = readFileSync("../../apps/web/app/account-actions.ts", "utf8");
const organizationPage = readFileSync("../../apps/web/app/onboarding/organization/page.tsx", "utf8");
const profilePage = readFileSync("../../apps/web/app/onboarding/profile/page.tsx", "utf8");

assert.ok(authModule.includes("OnboardingController"));
assert.ok(authModule.includes("OnboardingService"));
assert.ok(onboardingController.includes('@Post("organizations")'));
assert.ok(onboardingController.includes('@Post("profile")'));
assert.ok(onboardingService.includes("createOrganizationForSupabaseUser"));
assert.ok(onboardingService.includes("upsertEmployeeProfile"));
assert.ok(middleware.includes("shouldUseDemoAuth"));
assert.ok(middleware.includes("allowsUnlinkedSupabaseSession"));
assert.ok(accountActions.includes("resolveSupabaseSessionDestination"));
assert.ok(accountActions.includes("delete(sessionCookieNames.demoUserId)"));
assert.ok(organizationPage.includes("Create workspace"));
assert.ok(profilePage.includes("Save profile"));

assert.ok(shiftPipelineController.includes("!usePrismaWorkflow() && demoShiftSlots.length === 0"));
assert.equal(shiftPipelineController.includes('body.userId ?? "user_maya"'), false);
assert.equal(webActions.includes('unitId") ?? "unit_icu"'), false);
