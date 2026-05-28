"use server";

import { revalidatePath } from "next/cache";

import { apiPost, type DemoUserId } from "@/lib/api";

export async function claimOpenShiftAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId"));
  const userId = String(formData.get("userId") ?? "user_priya") as DemoUserId;
  await apiPost(`/workflows/open-shifts/${shiftId}/claim`, {}, userId);
  revalidatePath("/app/open-shifts");
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

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = String(formData.get("notificationId"));
  const userId = String(formData.get("userId") ?? "user_priya") as DemoUserId;
  await apiPost(`/notifications/${notificationId}/read`, {}, userId);
  revalidatePath("/app/notifications");
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
