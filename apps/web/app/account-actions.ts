"use server";

import { redirect } from "next/navigation";
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
  await apiPostWithAccessToken(
    "/onboarding/structure",
    {
      facilityName: String(formData.get("facilityName") ?? ""),
      facilityTimezone: String(formData.get("facilityTimezone") ?? ""),
      unitName: String(formData.get("unitName") ?? ""),
      unitType: String(formData.get("unitType") ?? "")
    },
    accessToken
  );
  redirect("/onboarding/profile");
}

export async function upsertProfileAction(formData: FormData) {
  const accessToken = await requireSupabaseAccessToken();
  await apiPostWithAccessToken(
    "/onboarding/profile",
    {
      legalName: String(formData.get("legalName") ?? ""),
      preferredName: String(formData.get("preferredName") ?? ""),
      employeeNumber: String(formData.get("employeeNumber") ?? ""),
      facilityId: String(formData.get("facilityId") ?? ""),
      unitId: String(formData.get("unitId") ?? ""),
      roleName: String(formData.get("roleName") ?? "RN"),
      employmentType: String(formData.get("employmentType") ?? "FULL_TIME")
    },
    accessToken
  );
  const session = await apiGetWithAccessToken<SessionSummary>("/auth/me", accessToken);
  if (session.role === "ORGANIZATION_OWNER" || session.role === "SYSTEM_ADMIN") {
    redirect("/onboarding/organization");
  }
  redirect("/app/home");
}

export async function inviteWorkforceMemberAction(formData: FormData) {
  const accessToken = await requireSupabaseAccessToken();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "EMPLOYEE");
  await apiPostWithAccessToken(
    "/users/invite",
    {
      email,
      role,
      scope: { type: "SELF" }
    },
    accessToken
  );
  redirect("/onboarding/organization?invited=1");
}

export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const accessToken =
    String(formData.get("accessToken") ?? "") || (await requireSupabaseAccessToken());
  await apiPostWithAccessToken<Invitation>(`/invitations/${token}/accept`, {}, accessToken);
  redirect("/onboarding/profile");
}
