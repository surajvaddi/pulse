"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { accessTokenCookieOptions, demoUserCookieOptions, sessionCookieNames } from "@pulseshift/tools";

import {
  apiGetWithAccessToken,
  apiPost,
  apiPostWithAccessToken,
  type DemoUserId,
  type Invitation
} from "@/lib/api";

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
  (await cookies()).set(sessionCookieNames.accessToken, accessToken, accessTokenCookieOptions(process.env));
  try {
    await apiGetWithAccessToken("/auth/me", accessToken);
  } catch {
    redirect("/onboarding/organization");
  }
  redirect("/app");
}

export async function createOrganizationAction(formData: FormData) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(sessionCookieNames.accessToken)?.value;
  if (!accessToken) {
    redirect("/login");
  }
  await apiPostWithAccessToken(
    "/onboarding/organizations",
    {
      name: String(formData.get("name") ?? ""),
      timezone: String(formData.get("timezone") ?? "America/New_York"),
      displayName: String(formData.get("displayName") ?? "")
    },
    accessToken
  );
  redirect("/app/admin");
}

export async function inviteWorkforceMemberAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "EMPLOYEE");
  await apiPost<Invitation>(
    "/users/invite",
    {
      email,
      role,
      scope: { type: "SELF" }
    },
    "user_admin"
  );
  redirect("/onboarding/organization?invited=1");
}

export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const accessToken = String(formData.get("accessToken") ?? "");
  const userId = String(formData.get("userId") ?? "user_priya") as DemoUserId;
  if (accessToken) {
    await apiPostWithAccessToken<Invitation>(`/invitations/${token}/accept`, {}, accessToken);
  } else {
    await apiPost<Invitation>(`/invitations/${token}/accept`, {}, userId);
  }
  redirect("/onboarding/profile");
}
