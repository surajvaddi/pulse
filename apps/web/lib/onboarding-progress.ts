import type { SessionSummary } from "@/lib/api";
import type { PulseShiftSessionIdentity, SupabaseAccessTokenClaims } from "@/lib/supabase-session";
import { requiresOrganizationOnboarding } from "@/lib/supabase-session";
import { AccountRoleSchema, onboardingRequirementsForRole } from "@pulseshift/domain";

export type OnboardingProgress = {
  hasLinkedSession: boolean;
  hasFacilities: boolean;
  needsProfileOnboarding: boolean;
  needsNotificationPreferencesOnboarding: boolean;
  needsIntegrationsOnboarding: boolean;
};

export function hasLinkedSession(session: SessionSummary | null | undefined): session is SessionSummary {
  return Boolean(session?.userId && session.organizationId);
}

export function sessionNeedsProfileOnboarding(
  session: SessionSummary,
  employeeProfile?: { id: string } | null
): boolean {
  const role = AccountRoleSchema.parse(session.role);
  if (!onboardingRequirementsForRole(role).requiresEmployeeProfile) {
    return false;
  }
  if (employeeProfile?.id) {
    return false;
  }
  return true;
}

export function sessionNeedsNotificationPreferencesOnboarding(session: SessionSummary): boolean {
  return Boolean(session.needsNotificationPreferencesOnboarding);
}

export function sessionNeedsIntegrationsOnboarding(session: SessionSummary): boolean {
  return Boolean(session.needsIntegrationsOnboarding);
}

export function buildOnboardingProgress(input: {
  session: SessionSummary | null;
  claims: SupabaseAccessTokenClaims;
  facilityCount: number;
  employeeProfile?: { id: string } | null;
}): OnboardingProgress {
  const linked = hasLinkedSession(input.session);
  return {
    hasLinkedSession: linked,
    hasFacilities: input.facilityCount > 0,
    needsProfileOnboarding:
      linked && input.session
        ? sessionNeedsProfileOnboarding(input.session, input.employeeProfile)
        : false,
    needsNotificationPreferencesOnboarding:
      linked && input.session ? sessionNeedsNotificationPreferencesOnboarding(input.session) : false,
    needsIntegrationsOnboarding:
      linked && input.session ? sessionNeedsIntegrationsOnboarding(input.session) : false
  };
}

export type OnboardingRoute =
  | "/login"
  | "/onboarding/organization"
  | "/onboarding/structure"
  | "/onboarding/profile"
  | "/onboarding/preferences"
  | "/onboarding/integrations"
  | "/app";

export function resolveOnboardingRoute(input: {
  claims: SupabaseAccessTokenClaims | null;
  session: SessionSummary | null;
  facilityCount: number;
  employeeProfile?: { id: string } | null;
}): OnboardingRoute {
  if (!input.claims) {
    return "/login";
  }

  if (!input.session) {
    return "/onboarding/organization";
  }

  const identity: PulseShiftSessionIdentity = {
    userId: input.session.userId,
    email: input.session.email,
    ...(input.session.supabaseAuthId ? { supabaseAuthId: input.session.supabaseAuthId } : {})
  };

  if (requiresOrganizationOnboarding(identity, input.claims)) {
    return "/onboarding/organization";
  }

  if (input.facilityCount === 0) {
    return "/onboarding/structure";
  }

  if (sessionNeedsProfileOnboarding(input.session, input.employeeProfile)) {
    return "/onboarding/profile";
  }

  if (sessionNeedsNotificationPreferencesOnboarding(input.session)) {
    return "/onboarding/preferences";
  }

  if (sessionNeedsIntegrationsOnboarding(input.session)) {
    return "/onboarding/integrations";
  }

  return "/app";
}
