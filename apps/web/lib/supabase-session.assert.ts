import assert from "node:assert/strict";

import {
  decodeSupabaseAccessTokenClaims,
  isSeededDemoUserId,
  pulseShiftSessionMatchesSupabaseClaims,
  requiresOrganizationOnboarding,
  resolveSupabaseSessionDestination
} from "./supabase-session";

function encodePart(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

const sampleToken = `${encodePart({ alg: "HS256", typ: "JWT" })}.${encodePart({
  sub: "supabase_user_new",
  email: "new.user@example.com"
})}.signature`;

assert.deepEqual(decodeSupabaseAccessTokenClaims(sampleToken), {
  sub: "supabase_user_new",
  email: "new.user@example.com"
});
assert.equal(decodeSupabaseAccessTokenClaims("not-a-jwt"), null);

assert.equal(isSeededDemoUserId("user_priya"), true);
assert.equal(isSeededDemoUserId("clxyz123"), false);

assert.equal(
  pulseShiftSessionMatchesSupabaseClaims(
    {
      userId: "clxyz123",
      email: "new.user@example.com",
      supabaseAuthId: "supabase_user_new"
    },
    { sub: "supabase_user_new", email: "new.user@example.com" }
  ),
  true
);
assert.equal(
  pulseShiftSessionMatchesSupabaseClaims(
    {
      userId: "user_priya",
      email: "priya.raman@example.com",
      supabaseAuthId: "supabase_user_priya"
    },
    { sub: "supabase_user_new", email: "new.user@example.com" }
  ),
  false
);

assert.equal(
  requiresOrganizationOnboarding(
    {
      userId: "user_priya",
      email: "priya.raman@example.com",
      supabaseAuthId: "supabase_user_priya"
    },
    { sub: "supabase_user_new", email: "new.user@example.com" }
  ),
  true
);
assert.equal(
  requiresOrganizationOnboarding(
    {
      userId: "clowner123",
      email: "owner@example.com",
      supabaseAuthId: "supabase_user_owner"
    },
    { sub: "supabase_user_owner", email: "owner@example.com" }
  ),
  false
);

assert.equal(resolveSupabaseSessionDestination({ accessToken: "bad-token" }), "/login");
assert.equal(resolveSupabaseSessionDestination({ accessToken: sampleToken, session: null }), "/onboarding/organization");
assert.equal(
  resolveSupabaseSessionDestination({
    accessToken: sampleToken,
    session: {
      userId: "clowner123",
      email: "new.user@example.com",
      supabaseAuthId: "supabase_user_new"
    }
  }),
  "/app"
);
