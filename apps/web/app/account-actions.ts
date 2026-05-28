"use server";

import { redirect } from "next/navigation";

import { apiPost, type DemoUserId, type Invitation } from "@/lib/api";

export async function startDemoSessionAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "user_priya");
  redirect(`/app/home?user=${encodeURIComponent(userId)}`);
}

export async function logoutAction() {
  await apiPost("/auth/logout", {}, "user_priya");
  redirect("/login");
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
  const userId = String(formData.get("userId") ?? "user_priya") as DemoUserId;
  await apiPost<Invitation>(`/invitations/${token}/accept`, {}, userId);
  redirect("/onboarding/profile");
}
