export type SupabaseAccessTokenClaims = {
  sub: string;
  email?: string;
};

export type PulseShiftSessionIdentity = {
  userId: string;
  email: string;
  supabaseAuthId?: string;
};

function decodeBase64UrlJson<T>(segment: string): T | null {
  try {
    const normalized = segment.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function decodeSupabaseAccessTokenClaims(accessToken: string): SupabaseAccessTokenClaims | null {
  const encodedPayload = accessToken.split(".")[1];
  if (!encodedPayload) {
    return null;
  }

  const payload = decodeBase64UrlJson<{ sub?: unknown; email?: unknown }>(encodedPayload);
  if (!payload || typeof payload.sub !== "string" || payload.sub.length === 0) {
    return null;
  }

  return {
    sub: payload.sub,
    ...(typeof payload.email === "string" ? { email: payload.email.toLowerCase() } : {})
  };
}

export function isSeededDemoUserId(userId: string): boolean {
  return userId.startsWith("user_");
}

export function pulseShiftSessionMatchesSupabaseClaims(
  session: PulseShiftSessionIdentity,
  claims: SupabaseAccessTokenClaims
): boolean {
  if (session.supabaseAuthId && session.supabaseAuthId === claims.sub) {
    return true;
  }

  if (claims.email && session.email.toLowerCase() === claims.email.toLowerCase()) {
    return true;
  }

  return false;
}

export function requiresOrganizationOnboarding(
  session: PulseShiftSessionIdentity,
  claims: SupabaseAccessTokenClaims
): boolean {
  if (isSeededDemoUserId(session.userId)) {
    return true;
  }

  return !pulseShiftSessionMatchesSupabaseClaims(session, claims);
}

export type SupabaseSessionDestination = "/app" | "/onboarding/organization" | "/login";

export function resolveSupabaseSessionDestination(input: {
  accessToken: string;
  session?: PulseShiftSessionIdentity | null;
}): SupabaseSessionDestination {
  const claims = decodeSupabaseAccessTokenClaims(input.accessToken);
  if (!claims) {
    return "/login";
  }

  if (!input.session) {
    return "/onboarding/organization";
  }

  if (requiresOrganizationOnboarding(input.session, claims)) {
    return "/onboarding/organization";
  }

  return "/app";
}
