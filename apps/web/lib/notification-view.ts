import type { Notification, SessionSummary } from "./api";

type NotificationAction = {
  label: string;
  href: string;
};

const categoryLabels: Record<string, string> = {
  SCHEDULE: "Schedule",
  SWAP: "Swap",
  APPROVAL: "Approval",
  STAFFING: "Staffing",
  TIMECARD: "Timecard",
  CREDENTIAL: "Credential",
  INTEGRATION: "Integration",
  AI_SAFETY: "AI safety",
  SYSTEM: "System"
};

const priorityLabels: Record<string, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent"
};

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function notificationTitle(notification: Notification) {
  return humanize(notification.type);
}

export function notificationSummary(notification: Notification) {
  switch (notification.type) {
    case "APPROVAL_REQUIRED":
      return "Approval review is waiting for a manager.";
    case "SHIFT_ASSIGNED":
      return "A shift was assigned to your schedule.";
    case "SHIFT_UPDATED":
      return "A schedule item changed.";
    case "SWAP_REQUESTED":
      return "A coworker requested a shift swap.";
    case "SWAP_APPROVED":
      return "A shift swap was approved.";
    case "SWAP_DENIED":
      return "A shift swap was denied.";
    case "TIMECARD_EXCEPTION":
      return "A timecard exception needs review.";
    case "STAFFING_RISK":
      return "A staffing risk needs attention.";
    case "CREDENTIAL_EXPIRING":
      return "A credential is approaching expiration.";
    default:
      return Object.keys(notification.payload).length
        ? Object.entries(notification.payload)
            .map(([key, value]) => `${humanize(key)}: ${value}`)
            .join(" · ")
        : "No additional details.";
  }
}

export function notificationMetadata(notification: Notification) {
  return [
    categoryLabels[notification.category] ?? humanize(notification.category),
    priorityLabels[notification.priority] ?? humanize(notification.priority),
    notification.channel.replaceAll("_", " "),
    notification.status.replaceAll("_", " ").toLowerCase()
  ].join(" · ");
}

export function notificationActionFor(
  notification: Notification,
  session: Pick<SessionSummary, "role">
): NotificationAction | null {
  if (session.role === "AI_AGENT_SERVICE") {
    return null;
  }
  if (notification.type === "APPROVAL_REQUIRED" && session.role === "UNIT_MANAGER") {
    return { label: "Review", href: "/app/manager" };
  }
  if (notification.category === "SWAP") {
    return { label: "Open swaps", href: "/app/swaps" };
  }
  if (notification.category === "TIMECARD") {
    return session.role === "PAYROLL_ADMIN"
      ? { label: "Review", href: "/app/timecards" }
      : { label: "Open timecard", href: "/app/timecards" };
  }
  if (notification.category === "CREDENTIAL") {
    return { label: "Open credentials", href: "/app/credentials" };
  }
  if (notification.category === "STAFFING") {
    return { label: "Open staffing", href: "/app/staffing" };
  }
  if (notification.category === "INTEGRATION") {
    return ["SYSTEM_ADMIN", "ORGANIZATION_OWNER"].includes(session.role)
      ? { label: "Open integrations", href: "/app/admin/integrations" }
      : null;
  }
  return notification.category === "SCHEDULE"
    ? { label: "Open schedule", href: "/app/schedule" }
    : null;
}
