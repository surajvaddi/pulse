"use server";

import { redirect } from "next/navigation";
import {
  AccountRoleSchema,
  onboardingRequirementsForRole
} from "@pulseshift/domain";
import { cookies } from "next/headers";
import { accessTokenCookieOptions, demoUserCookieOptions, sessionCookieNames } from "@pulseshift/tools";

import {
  apiGetWithAccessToken,
  apiPost,
  apiPostWithAccessToken,
  type Invitation,
  type SessionSummary
} from "@/lib/api";
import { requireSupabaseAccessToken } from "@/lib/onboarding-access";
import { resolveOnboardingRoute } from "@/lib/onboarding-progress";
import { decodeSupabaseAccessTokenClaims } from "@/lib/supabase-session";

export async function startDemoSessionAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "user_priya");
  (await cookies()).set(sessionCookieNames.demoUserId, userId, demoUserCookieOptions(process.env));
  redirect("/app");
}

export async function logoutAction() {
  await apiPost("/auth/logout", {}, "user_priya");
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieNames.accessToken);
  cookieStore.delete(sessionCookieNames.demoUserId);
  redirect("/login");
}

export async function establishSupabaseSessionAction(accessToken: string) {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieNames.demoUserId);
  cookieStore.set(sessionCookieNames.accessToken, accessToken, accessTokenCookieOptions(process.env));

  const claims = decodeSupabaseAccessTokenClaims(accessToken);
  let session: SessionSummary | null = null;
  try {
    session = await apiGetWithAccessToken<SessionSummary>("/auth/me", accessToken);
  } catch {
    session = null;
  }

  const destination = resolveOnboardingRoute({
    claims,
    session,
    facilityCount: session?.facilityCount ?? 0,
    employeeProfile: session?.employeeProfile ?? null
  });
  redirect(destination);
}

export async function createOrganizationAction(formData: FormData) {
  const accessToken = await requireSupabaseAccessToken();
  await apiPostWithAccessToken(
    "/onboarding/organizations",
    {
      name: String(formData.get("name") ?? ""),
      timezone: String(formData.get("timezone") ?? "America/New_York"),
      displayName: String(formData.get("displayName") ?? "")
    },
    accessToken
  );
  redirect("/onboarding/structure");
}

export async function bootstrapStructureAction(formData: FormData) {
  const accessToken = await requireSupabaseAccessToken();
  const result = await apiPostWithAccessToken<{ nextStep: string }>(
    "/onboarding/structure",
    {
      facilityName: String(formData.get("facilityName") ?? ""),
      facilityTimezone: String(formData.get("facilityTimezone") ?? ""),
      unitName: String(formData.get("unitName") ?? ""),
      unitType: String(formData.get("unitType") ?? "")
    },
    accessToken
  );
  redirect(result.nextStep);
}

export async function upsertProfileAction(formData: FormData) {
  const accessToken = await requireSupabaseAccessToken();
  const result = await apiPostWithAccessToken<{ nextStep: string }>(
    "/onboarding/profile",
    {
      legalName: String(formData.get("legalName") ?? ""),
      preferredName: String(formData.get("preferredName") ?? "")
    },
    accessToken
  );
  redirect(result.nextStep);
}

export async function completeNotificationPreferencesAction(formData: FormData) {
  const accessToken = await requireSupabaseAccessToken();
  const result = await apiPostWithAccessToken<{ nextStep: string }>(
    "/onboarding/preferences",
    {
      phone: String(formData.get("phone") ?? ""),
      emailAlertsEnabled: formData.get("emailAlertsEnabled") === "on",
      smsAlertsEnabled: formData.get("smsAlertsEnabled") === "on"
    },
    accessToken
  );
  redirect(result.nextStep);
}

export async function completeIntegrationsOnboardingAction(formData: FormData) {
  const accessToken = await requireSupabaseAccessToken();
  const action = String(formData.get("action") ?? "skip") as "skip" | "continue";
  const result = await apiPostWithAccessToken<{ nextStep: string }>(
    "/onboarding/integrations",
    { action },
    accessToken
  );
  redirect(result.nextStep);
}

export async function inviteWorkforceMemberAction(formData: FormData) {
  const accessToken = await requireSupabaseAccessToken();
  const email = String(formData.get("email") ?? "").trim();
  const role = AccountRoleSchema.parse(
    String(formData.get("role") ?? "EMPLOYEE")
  );
  const facilityId = String(formData.get("facilityId") ?? "");
  const unitId = String(formData.get("unitId") ?? "");
  const facilityScoped =
    role === "WORKFORCE_ADMIN" || role === "FLOAT_POOL_COORDINATOR";
  const unitScoped = role === "UNIT_MANAGER" || role === "CHARGE_NURSE";
  const requiresWorkforceAssignment =
    onboardingRequirementsForRole(role).requiresEmployeeProfile;
  const employeeNumberPolicy = String(
    formData.get("employeeNumberPolicy") ?? "AUTO"
  ) as "AUTO" | "ASSIGNED";
  const employeeNumber = String(formData.get("employeeNumber") ?? "").trim();
  await apiPostWithAccessToken(
    "/users/invite",
    {
      email,
      role,
      selection: {
        ...(facilityScoped && facilityId ? { facilityIds: [facilityId] } : {}),
        ...(unitScoped && unitId ? { unitIds: [unitId] } : {})
      },
      ...(requiresWorkforceAssignment
        ? {
            workforceAssignment: {
              facilityId,
              unitId,
              workforceRoleId: String(formData.get("workforceRoleId") ?? ""),
              employmentType: String(
                formData.get("employmentType") ?? "FULL_TIME"
              ),
              employeeNumberPolicy,
              ...(employeeNumberPolicy === "ASSIGNED" && employeeNumber
                ? { employeeNumber }
                : {})
            }
          }
        : {})
    },
    accessToken
  );
  redirect("/onboarding/organization?invited=1");
}

export async function createWorkforceRoleAction(formData: FormData) {
  const accessToken = await requireSupabaseAccessToken();
  await apiPostWithAccessToken(
    "/onboarding/workforce-roles",
    {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? "")
    },
    accessToken
  );
  redirect("/onboarding/organization?roleCreated=1");
}

export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const accessToken =
    String(formData.get("accessToken") ?? "") || (await requireSupabaseAccessToken());
  await apiPostWithAccessToken<Invitation>(`/invitations/${token}/accept`, {}, accessToken);
  const claims = decodeSupabaseAccessTokenClaims(accessToken);
  const session = await apiGetWithAccessToken<SessionSummary>("/auth/me", accessToken);
  const destination = resolveOnboardingRoute({
    claims,
    session,
    facilityCount: session.facilityCount ?? 0,
    employeeProfile: session.employeeProfile ?? null
  });
  redirect(destination === "/app" ? "/app/home" : destination);
}

export async function acceptPendingInvitationAction(formData: FormData) {
  const invitationId = String(formData.get("invitationId") ?? "");
  const acceptanceHandle = String(formData.get("acceptanceHandle") ?? "");
  const accessToken = await requireSupabaseAccessToken();
  await apiPostWithAccessToken<Invitation>(
    `/invitations/pending/${invitationId}/accept`,
    { acceptanceHandle },
    accessToken
  );
  const claims = decodeSupabaseAccessTokenClaims(accessToken);
  const session = await apiGetWithAccessToken<SessionSummary>(
    "/auth/me",
    accessToken
  );
  const destination = resolveOnboardingRoute({
    claims,
    session,
    facilityCount: session.facilityCount ?? 0,
    employeeProfile: session.employeeProfile ?? null
  });
  redirect(destination === "/app" ? "/app/home" : destination);
}
