import { redirect } from "next/navigation";

import { apiGetWithAccessToken, type SessionSummary } from "@/lib/api";
import { readSupabaseAccessToken } from "@/lib/onboarding-access";
import { resolveOnboardingRoute, type OnboardingRoute } from "@/lib/onboarding-progress";
import { decodeSupabaseAccessTokenClaims } from "@/lib/supabase-session";

export type OnboardingContext = {
  accessToken: string;
  claims: NonNullable<ReturnType<typeof decodeSupabaseAccessTokenClaims>>;
  session: SessionSummary | null;
  route: OnboardingRoute;
};

export async function loadOnboardingContext(): Promise<OnboardingContext> {
  const accessToken = await readSupabaseAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const claims = decodeSupabaseAccessTokenClaims(accessToken);
  if (!claims) {
    redirect("/login");
  }

  let session: SessionSummary | null = null;
  try {
    session = await apiGetWithAccessToken<SessionSummary>("/auth/me", accessToken);
  } catch {
    session = null;
  }

  const route = resolveOnboardingRoute({
    claims,
    session,
    facilityCount: session?.facilityCount ?? 0,
    employeeProfile: session?.employeeProfile ?? null
  });

  return { accessToken, claims, session, route };
}

export async function requireOnboardingStep(step: OnboardingRoute): Promise<OnboardingContext> {
  const context = await loadOnboardingContext();
  if (context.route !== step) {
    redirect(context.route);
  }
  return context;
}
