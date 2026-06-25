export type EmployeeEmptyStateKind =
  | "INCOMPLETE_PROFILE"
  | "NO_SCHEDULE"
  | "NO_AVAILABLE_SHIFTS"
  | "NO_PERMISSION"
  | "POLICY_BLOCK"
  | "SERVICE_FAILURE";

export type EmployeeEmptyState = {
  eyebrow: string;
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
};

const states: Record<EmployeeEmptyStateKind, EmployeeEmptyState> = {
  INCOMPLETE_PROFILE: {
    eyebrow: "Profile required",
    title: "Finish your workforce profile",
    message: "Your placement and qualifications must be complete before shifts can be shown.",
    actionLabel: "Complete profile",
    actionHref: "/onboarding/profile"
  },
  NO_SCHEDULE: {
    eyebrow: "Schedule",
    title: "No assigned shifts yet",
    message: "Your published schedule is empty for the current workspace and date range.",
    actionLabel: "Browse open shifts",
    actionHref: "/app/open-shifts"
  },
  NO_AVAILABLE_SHIFTS: {
    eyebrow: "Open shifts",
    title: "No shifts match these filters",
    message: "Try a wider date range or remove one of the eligibility filters.",
    actionLabel: "Clear filters",
    actionHref: "/app/open-shifts"
  },
  NO_PERMISSION: {
    eyebrow: "Access",
    title: "This workspace is outside your access",
    message: "Choose an assigned workspace or ask an administrator to review your scope.",
    actionLabel: "Return home",
    actionHref: "/app/home"
  },
  POLICY_BLOCK: {
    eyebrow: "Eligibility",
    title: "Policy prevents this action",
    message: "Review the qualification, rest, overlap, or overtime reason shown for the shift.",
    actionLabel: "View your schedule",
    actionHref: "/app/schedule"
  },
  SERVICE_FAILURE: {
    eyebrow: "Unavailable",
    title: "Shift data could not be loaded",
    message: "The service did not complete the request. Retry after confirming the API is available.",
    actionLabel: "Retry",
    actionHref: "/app/open-shifts"
  }
};

export function employeeEmptyState(kind: EmployeeEmptyStateKind) {
  return states[kind];
}
