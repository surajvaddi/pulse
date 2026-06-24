"use server";

import { revalidatePath } from "next/cache";

import { apiPatch, apiPost, apiPatchSession, apiPostSession, type DemoUserId } from "@/lib/api";
import { demoResetEnabledForEnv } from "@/lib/demo-controls";

export async function claimOpenShiftAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId"));
  const userId = String(formData.get("userId") ?? "user_priya") as DemoUserId;
  await apiPost(`/shift-pipeline/slots/${shiftId}/claim`, {}, userId);
  revalidatePath("/app/open-shifts");
  revalidatePath("/app/schedule");
  revalidatePath("/app/manager");
}

export async function createSwapAction(formData: FormData) {
  const originalShiftId = String(formData.get("originalShiftId"));
  await apiPost(
    "/workflows/swaps",
    {
      originalShiftId,
      proposedUserId: "user_maya"
    },
    "user_priya"
  );
  revalidatePath("/app/swaps");
}

export async function acceptSwapAction(formData: FormData) {
  const swapId = String(formData.get("swapId"));
  await apiPost(`/workflows/swaps/${swapId}/accept`, {}, "user_maya");
  revalidatePath("/app/swaps");
  revalidatePath("/app/manager");
}

export async function approveSwapAction(formData: FormData) {
  const swapId = String(formData.get("swapId"));
  await apiPost(
    `/workflows/swaps/${swapId}/approve`,
    {
      reason: "Demo manager approval after policy review"
    },
    "user_jordan_manager"
  );
  revalidatePath("/app/swaps");
  revalidatePath("/app/schedule");
  revalidatePath("/app/manager");
}

export async function createCanonicalSwapAction(formData: FormData) {
  const originalSlotId = String(formData.get("originalSlotId"));
  const proposedUserId = String(formData.get("proposedUserId"));
  const requesterUserId = String(formData.get("requesterUserId") ?? "user_priya") as DemoUserId;
  await apiPost("/swap-pipeline/swaps", { originalSlotId, proposedUserId }, requesterUserId);
  revalidatePath("/app/swaps");
  revalidatePath("/app/schedule");
  revalidatePath("/app/manager");
}

export async function respondCanonicalSwapAction(formData: FormData) {
  const swapId = String(formData.get("swapId"));
  const decision = String(formData.get("decision") ?? "decline");
  const userId = String(formData.get("userId") ?? "user_maya") as DemoUserId;
  await apiPost(`/swap-pipeline/swaps/${swapId}/respond`, { decision }, userId);
  revalidatePath("/app/swaps");
  revalidatePath("/app/manager");
}

export async function decideCanonicalSwapAction(formData: FormData) {
  const swapId = String(formData.get("swapId"));
  const decision = String(formData.get("decision") ?? "deny");
  await apiPost(
    `/swap-pipeline/swaps/${swapId}/decide`,
    { decision, reason: "Reviewed from canonical swap center" },
    "user_jordan_manager"
  );
  revalidatePath("/app/swaps");
  revalidatePath("/app/schedule");
  revalidatePath("/app/manager");
}

export async function approveShiftClaimAction(formData: FormData) {
  const claimId = String(formData.get("claimId"));
  await apiPost(
    `/shift-pipeline/claims/${claimId}/approve`,
    { reason: "Manager approved from coverage dashboard" },
    "user_jordan_manager"
  );
  revalidatePath("/app/manager");
  revalidatePath("/app/open-shifts");
  revalidatePath("/app/schedule");
}

export async function denyShiftClaimAction(formData: FormData) {
  const claimId = String(formData.get("claimId"));
  await apiPost(
    `/shift-pipeline/claims/${claimId}/deny`,
    { reason: "Manager denied from coverage dashboard" },
    "user_jordan_manager"
  );
  revalidatePath("/app/manager");
  revalidatePath("/app/open-shifts");
}

export async function directAssignShiftAction(formData: FormData) {
  const slotId = String(formData.get("slotId"));
  const userId = String(formData.get("userId") ?? "user_maya");
  await apiPost(`/shift-pipeline/slots/${slotId}/assign`, { userId }, "user_jordan_manager");
  revalidatePath("/app/manager");
  revalidatePath("/app/open-shifts");
  revalidatePath("/app/schedule");
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = String(formData.get("notificationId"));
  const userId = String(formData.get("userId") ?? "user_priya") as DemoUserId;
  await apiPost(`/notifications/${notificationId}/read`, {}, userId);
  revalidatePath("/app/notifications");
  revalidatePath("/app", "layout");
}

export async function updateNotificationPreferenceAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "user_priya") as DemoUserId;
  const category = String(formData.get("category"));
  const channel = String(formData.get("channel"));
  const enabled = String(formData.get("enabled")) === "true";
  await apiPost("/notifications/preferences", { category, channel, enabled }, userId);
  revalidatePath("/app/notifications/preferences");
}

export async function askCopilotAction(formData: FormData) {
  const message = String(formData.get("message") ?? "");
  const userId = String(formData.get("userId") ?? "user_priya") as DemoUserId;
  const encoded = encodeURIComponent(message);
  await apiPost("/copilot/messages", { message }, userId);
  revalidatePath(`/app/copilot?last=${encoded}`);
}

export async function resolveTimecardAction(formData: FormData) {
  const exceptionId = String(formData.get("exceptionId"));
  await apiPost(
    `/operations/timecards/exceptions/${exceptionId}/resolve`,
    { resolution: "Payroll reviewed employee note and manager context" },
    "user_payroll"
  );
  revalidatePath("/app/timecards");
  revalidatePath("/app/manager");
}

export async function clockInAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId") ?? "");
  await apiPost(
    "/timeclock/clock-in",
    shiftId ? { shiftId } : {},
    "user_priya"
  );
  revalidatePath("/app/timecards");
  revalidatePath("/app/home");
}

export async function clockOutAction(_formData: FormData) {
  await apiPost("/timeclock/clock-out", {}, "user_priya");
  revalidatePath("/app/timecards");
  revalidatePath("/app/home");
}

export async function runIntegrationSyncAction(formData: FormData) {
  const integrationId = String(formData.get("integrationId"));
  const direction = String(formData.get("direction") ?? "BIDIRECTIONAL");
  await apiPostSession(`/integrations/${integrationId}/sync`, { direction }, "user_admin");
  revalidatePath("/app/admin/integrations");
}

export async function runCopilotEvalAction() {
  await apiPostSession("/evals/copilot/run", {}, "user_admin");
  revalidatePath("/app/admin/evals");
}

export async function resetDemoAction() {
  if (!demoResetEnabledForEnv()) {
    return;
  }
  await apiPostSession("/demo/reset", {}, "user_admin");
  revalidatePath("/app/admin/audit");
  revalidatePath("/app/home");
  revalidatePath("/app/schedule");
  revalidatePath("/app/swaps");
  revalidatePath("/app/timecards");
  revalidatePath("/app/manager");
  revalidatePath("/app/admin/evals");
  revalidatePath("/app/admin/integrations");
}

export async function createAdminFacilityAction(formData: FormData) {
  await apiPostSession("/admin/facilities", {
    name: String(formData.get("name") ?? ""),
    timezone: String(formData.get("timezone") ?? "America/New_York"),
    reason: String(formData.get("reason") ?? "Created from admin UI")
  }, "user_admin");
  revalidatePath("/app/admin/facilities");
  revalidatePath("/app/admin/units");
  revalidatePath("/onboarding/profile");
}

export async function createAdminUnitAction(formData: FormData) {
  await apiPostSession("/admin/units", {
    facilityId: String(formData.get("facilityId") ?? ""),
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "OTHER"),
    managerUserIds: String(formData.get("managerUserIds") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    reason: String(formData.get("reason") ?? "Created from admin UI")
  }, "user_admin");
  revalidatePath("/app/admin/units");
}

export async function suspendAdminUserAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  await apiPatchSession(`/admin/users/${userId}/status`, {
    status: "SUSPENDED",
    reason: String(formData.get("reason") ?? "Suspended from admin UI")
  }, "user_admin");
  revalidatePath("/app/admin/users");
}

export async function assignAdminRoleAction(formData: FormData) {
  const role = String(formData.get("role") ?? "EMPLOYEE");
  const unitId = String(formData.get("unitId") ?? "");
  await apiPostSession("/admin/roles", {
    userId: String(formData.get("userId") ?? ""),
    role,
    scope: unitId ? { type: "UNIT", unitIds: [unitId] } : { type: "SELF" },
    reason: String(formData.get("reason") ?? "Assigned from admin UI")
  }, "user_admin");
  revalidatePath("/app/admin/roles");
  revalidatePath("/app/admin/users");
}

export async function createAdminInvitationAction(formData: FormData) {
  await apiPostSession("/admin/invitations", {
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? "EMPLOYEE"),
    selection: {},
    reason: String(formData.get("reason") ?? "Invited from admin UI")
  }, "user_admin");
  revalidatePath("/app/admin/invitations");
}
