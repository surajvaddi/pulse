import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const accountActions = readFileSync("app/account-actions.ts", "utf8");
const organizationPage = readFileSync("app/onboarding/organization/page.tsx", "utf8");
const profilePage = readFileSync("app/onboarding/profile/page.tsx", "utf8");
const onboardingAccess = readFileSync("lib/onboarding-access.ts", "utf8");

assert.ok(onboardingAccess.includes("requireSupabaseAccessToken"));
assert.ok(accountActions.includes('apiPostWithAccessToken('));
assert.ok(accountActions.includes('"/onboarding/profile"'));
assert.ok(accountActions.includes('"/users/invite"'));
assert.equal(accountActions.includes('"user_admin"'), false);
assert.ok(onboardingAccess.includes("readSupabaseAccessToken"));
assert.ok(organizationPage.includes("decodeSupabaseAccessTokenClaims"));
assert.ok(organizationPage.includes('redirect("/login")'));
assert.ok(profilePage.includes("apiGetWithAccessToken"));
assert.ok(profilePage.includes("requireSupabaseAccessToken"));
