"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AccountRoleSchema,
  onboardingRequirementsForRole
} from "@pulseshift/domain";

import { apiPatch, apiPost, apiPatchSession, apiPostSession, type DemoUserId } from "@/lib/api";
import { demoResetEnabledForEnv } from "@/lib/demo-controls";

export async function claimOpenShiftAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId"));
  await apiPostSession(`/shift-pipeline/slots/${shiftId}/claim`, {});
  revalidatePath("/app/open-shifts");
  revalidatePath("/app/schedule");
  revalidatePath("/app/manager");
}

export async function updateWorkspaceContextAction(formData: FormData) {
  const facilityId = String(formData.get("facilityId") ?? "");
  const unitId = String(formData.get("unitId") ?? "");
  await apiPostSession("/auth/workspace-context", {
    ...(facilityId ? { facilityId } : {}),
    ...(unitId ? { unitId } : {})
  });
  revalidatePath("/app", "layout");
}

export async function createDraftShiftAction(formData: FormData) {
  await apiPostSession("/shift-pipeline/slots/draft", {
    facilityId: String(formData.get("facilityId") ?? ""),
    unitId: String(formData.get("unitId") ?? ""),
    roleRequiredId: String(formData.get("roleRequiredId") ?? ""),
    certificationRequiredIds: [],
    startsAt: new Date(String(formData.get("startsAt") ?? "")).toISOString(),
    endsAt: new Date(String(formData.get("endsAt") ?? "")).toISOString()
  });
  revalidatePath("/app/schedule/planning");
}

export async function expandStaffingRequirementAction(formData: FormData) {
  await apiPostSession("/shift-pipeline/slots/expand-requirement", {
    facilityId: String(formData.get("facilityId") ?? ""),
    unitId: String(formData.get("unitId") ?? ""),
    roleId: String(formData.get("roleRequiredId") ?? ""),
    certificationRequiredIds: [],
    startAt: new Date(String(formData.get("startsAt") ?? "")).toISOString(),
    endAt: new Date(String(formData.get("endsAt") ?? "")).toISOString(),
    minRequired: Number(formData.get("minRequired") ?? 1),
    idealRequired: Number(formData.get("idealRequired") ?? 1)
  });
  revalidatePath("/app/schedule/planning");
}

export async function publishDraftShiftsAction(formData: FormData) {
  await apiPostSession("/shift-pipeline/slots/publish", {
    facilityId: String(formData.get("facilityId") ?? ""),
    slotIds: formData.getAll("slotId").map(String),
    confirmed: formData.get("confirmed") === "on"
  });
  revalidatePath("/app/schedule/planning");
  revalidatePath("/app/open-shifts");
}

export async function lockScheduleSlotsAction(formData: FormData) {
  await apiPostSession("/shift-pipeline/slots/lock", {
    facilityId: String(formData.get("facilityId") ?? ""),
    slotIds: formData.getAll("slotId").map(String),
    reason: String(formData.get("reason") ?? "")
  });
  revalidatePath("/app/schedule/planning");
}

export async function createCanonicalSwapAction(formData: FormData) {
  const originalSlotId = String(formData.get("originalSlotId"));
  const proposedUserId = String(formData.get("proposedUserId"));
  await apiPostSession("/swap-pipeline/swaps", {
    originalSlotId,
    proposedUserId
  });
  revalidatePath("/app/swaps");
  revalidatePath("/app/schedule");
  revalidatePath("/app/manager");
}

export async function respondCanonicalSwapAction(formData: FormData) {
  const swapId = String(formData.get("swapId"));
  const decision = String(formData.get("decision") ?? "decline");
  await apiPostSession(`/swap-pipeline/swaps/${swapId}/respond`, { decision });
  revalidatePath("/app/swaps");
  revalidatePath("/app/manager");
}

export async function decideCanonicalSwapAction(formData: FormData) {
  const swapId = String(formData.get("swapId"));
  const decision = String(formData.get("decision") ?? "deny");
  await apiPostSession(
    `/swap-pipeline/swaps/${swapId}/decide`,
    { decision, reason: "Reviewed from canonical swap center" }
  );
  revalidatePath("/app/swaps");
  revalidatePath("/app/schedule");
  revalidatePath("/app/manager");
}

export async function approveShiftClaimAction(formData: FormData) {
  const claimId = String(formData.get("claimId"));
  await apiPostSession(
    `/shift-pipeline/claims/${claimId}/approve`,
    { reason: "Manager approved from coverage dashboard" }
  );
  revalidatePath("/app/manager");
  revalidatePath("/app/open-shifts");
  revalidatePath("/app/schedule");
}

export async function denyShiftClaimAction(formData: FormData) {
  const claimId = String(formData.get("claimId"));
  await apiPostSession(
    `/shift-pipeline/claims/${claimId}/deny`,
    { reason: "Manager denied from coverage dashboard" }
  );
  revalidatePath("/app/manager");
  revalidatePath("/app/open-shifts");
}

export async function directAssignShiftAction(formData: FormData) {
  const slotId = String(formData.get("slotId"));
  const userId = String(formData.get("userId") ?? "");
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();
  if (!userId) {
    throw new Error("Select an assignment candidate.");
  }
  await apiPostSession(`/shift-pipeline/slots/${slotId}/assign`, {
    userId,
    ...(overrideReason ? { overrideReason } : {})
  });
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
  const message = String(formData.get("message") ?? "").trim();
  if (!message) {
    redirect("/app/copilot");
  }
  const encoded = encodeURIComponent(message);
  redirect(`/app/copilot?last=${encoded}`);
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
  await apiPostSession("/admin/invitations", {
    email: String(formData.get("email") ?? ""),
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
      : {}),
    reason: String(formData.get("reason") ?? "Invited from admin UI")
  }, "user_admin");
  revalidatePath("/app/admin/invitations");
}
