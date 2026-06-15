import assert from "node:assert/strict";

import {
  buildOnboardingProgress,
  resolveOnboardingRoute,
  sessionNeedsNotificationPreferencesOnboarding,
  sessionNeedsProfileOnboarding
} from "./onboarding-progress";

const claims = { sub: "supabase_owner", email: "owner@example.com" };
const session = {
  userId: "clowner",
  organizationId: "org_1",
  displayName: "Morgan Owner",
  email: "owner@example.com",
  role: "ORGANIZATION_OWNER",
  permissions: [],
  supabaseAuthId: "supabase_owner"
};

assert.equal(resolveOnboardingRoute({ claims: null, session: null, facilityCount: 0 }), "/login");
assert.equal(resolveOnboardingRoute({ claims, session: null, facilityCount: 0 }), "/onboarding/organization");
assert.equal(
  resolveOnboardingRoute({ claims, session, facilityCount: 0, employeeProfile: null }),
  "/onboarding/structure"
);
assert.equal(
  resolveOnboardingRoute({
    claims,
    session,
    facilityCount: 1,
    employeeProfile: null
  }),
  "/onboarding/profile"
);
assert.equal(
  resolveOnboardingRoute({
    claims,
    session: {
      ...session,
      needsNotificationPreferencesOnboarding: true,
      needsIntegrationsOnboarding: true
    },
    facilityCount: 1,
    employeeProfile: { id: "emp_owner" }
  }),
  "/onboarding/preferences"
);
assert.equal(
  resolveOnboardingRoute({
    claims,
    session: {
      ...session,
      needsNotificationPreferencesOnboarding: false,
      needsIntegrationsOnboarding: true
    },
    facilityCount: 1,
    employeeProfile: { id: "emp_owner" }
  }),
  "/onboarding/integrations"
);
assert.equal(
  resolveOnboardingRoute({
    claims,
    session: {
      ...session,
      needsNotificationPreferencesOnboarding: false,
      needsIntegrationsOnboarding: false
    },
    facilityCount: 1,
    employeeProfile: { id: "emp_owner" }
  }),
  "/app"
);

assert.equal(sessionNeedsProfileOnboarding(session, null), true);
assert.equal(sessionNeedsProfileOnboarding(session, { id: "emp_owner" }), false);
assert.equal(
  sessionNeedsNotificationPreferencesOnboarding({
    ...session,
    needsNotificationPreferencesOnboarding: true
  }),
  true
);

const progress = buildOnboardingProgress({
  claims,
  session,
  facilityCount: 0,
  employeeProfile: null
});
assert.equal(progress.hasLinkedSession, true);
assert.equal(progress.hasFacilities, false);
assert.equal(progress.needsProfileOnboarding, true);
