import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authController = readFileSync("src/auth/auth.controller.ts", "utf8");
const authSessionService = readFileSync("src/auth/auth-session.service.ts", "utf8");
const accountActions = readFileSync("../../apps/web/app/account-actions.ts", "utf8");

assert.ok(authSessionService.includes("buildMeResponse"));
assert.ok(authSessionService.includes("needsProfileOnboarding"));
assert.ok(authSessionService.includes("facilityCount"));
assert.ok(authController.includes("buildMeResponse"));
assert.ok(accountActions.includes("resolveOnboardingRoute"));
