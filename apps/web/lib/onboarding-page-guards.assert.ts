import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guards = readFileSync("lib/onboarding-guards.ts", "utf8");
const organizationPage = readFileSync("app/onboarding/organization/page.tsx", "utf8");
const profilePage = readFileSync("app/onboarding/profile/page.tsx", "utf8");
const structurePage = readFileSync("app/onboarding/structure/page.tsx", "utf8");

assert.ok(guards.includes("requireOnboardingStep"));
assert.ok(guards.includes("resolveOnboardingRoute"));
assert.ok(organizationPage.includes("loadOnboardingContext"));
assert.ok(profilePage.includes("requireOnboardingStep"));
assert.ok(structurePage.includes("requireOnboardingStep") || structurePage.includes("facilities.length"));
