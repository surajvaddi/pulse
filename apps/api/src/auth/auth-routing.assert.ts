import assert from "node:assert/strict";

import {
  demoAuthEnabledForEnvironment,
  requestHasBearerToken,
  shouldUseDemoAuth,
  allowsUnlinkedSupabaseSession
} from "./auth-routing";

assert.equal(requestHasBearerToken(undefined), false);
assert.equal(requestHasBearerToken("Basic abc"), false);
assert.equal(requestHasBearerToken("Bearer "), false);
assert.equal(requestHasBearerToken("Bearer token-123"), true);

assert.equal(
  shouldUseDemoAuth({
    demoAuthEnabled: true,
    authorizationHeader: undefined
  }),
  true
);
assert.equal(
  shouldUseDemoAuth({
    demoAuthEnabled: true,
    authorizationHeader: "Bearer real-token"
  }),
  false
);
assert.equal(
  shouldUseDemoAuth({
    demoAuthEnabled: false,
    authorizationHeader: undefined
  }),
  false
);
assert.equal(
  shouldUseDemoAuth({
    demoAuthEnabled: false,
    authorizationHeader: "Bearer real-token"
  }),
  false
);

assert.equal(demoAuthEnabledForEnvironment({ ENABLE_DEMO_AUTH: "true" }), true);
assert.equal(demoAuthEnabledForEnvironment({ ENABLE_DEMO_AUTH: "false" }), false);
assert.equal(demoAuthEnabledForEnvironment({}), true);

assert.equal(
  allowsUnlinkedSupabaseSession({ method: "POST", path: "/onboarding/organizations" }),
  true
);
assert.equal(
  allowsUnlinkedSupabaseSession({ method: "GET", path: "/onboarding/organizations" }),
  false
);
assert.equal(
  allowsUnlinkedSupabaseSession({ method: "POST", path: "/invitations/abc/accept" }),
  true
);
assert.equal(
  allowsUnlinkedSupabaseSession({ method: "GET", path: "/invitations/pending" }),
  true
);
