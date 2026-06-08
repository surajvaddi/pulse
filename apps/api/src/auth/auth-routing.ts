export type AuthRoutingInput = {
  demoAuthEnabled: boolean;
  authorizationHeader?: string | undefined;
};

export function requestHasBearerToken(authorizationHeader: string | undefined): boolean {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return false;
  }
  return authorizationHeader.slice("Bearer ".length).trim().length > 0;
}

/**
 * Demo auth is active only when demo mode is enabled and the caller did not
 * supply a Supabase bearer token. Bearer tokens always route through Supabase
 * verification so real accounts are not replaced by seeded demo identities.
 */
export function shouldUseDemoAuth(input: AuthRoutingInput): boolean {
  if (!input.demoAuthEnabled) {
    return false;
  }
  return !requestHasBearerToken(input.authorizationHeader);
}

export function demoAuthEnabledForEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ENABLE_DEMO_AUTH !== "false";
}

export type UnlinkedSupabaseRouteInput = {
  method: string;
  path: string;
};

/**
 * Routes that accept a valid Supabase JWT before the account is linked in PulseShift.
 */
export function allowsUnlinkedSupabaseSession(input: UnlinkedSupabaseRouteInput): boolean {
  const normalizedPath = input.path.split("?")[0] ?? input.path;
  return (
    (input.method === "POST" && normalizedPath.startsWith("/invitations/")) ||
    (input.method === "POST" && normalizedPath === "/onboarding/organizations")
  );
}
