import type { DemoShift, SessionSummary, TimecardException, TimeclockStatus } from "@/lib/api";

export type EmployeeDashboardInput = {
  session: SessionSummary;
  shifts: DemoShift[];
  exceptions: TimecardException[];
  clockStatus: TimeclockStatus;
};

export type EmployeeDashboardCard = {
  title: string;
  value: string;
  detail: string;
  tone: "neutral" | "ready" | "attention";
};

export type EmployeeDashboardModel = {
  firstName: string;
  heading: string;
  summary: string;
  nextShift: DemoShift | null;
  clockStatus: TimeclockStatus;
  cards: EmployeeDashboardCard[];
  primaryAction: "CLOCK_IN" | "CLOCK_OUT";
};

export function formatDashboardDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function buildEmployeeDashboard(input: EmployeeDashboardInput): EmployeeDashboardModel {
  const nextShift = input.shifts.at(0) ?? null;
  const openExceptions = input.exceptions.filter((exception) => exception.status !== "RESOLVED");
  const firstName = input.session.displayName.split(" ").at(0) ?? input.session.displayName;
  const isClockedIn = input.clockStatus.status === "CLOCKED_IN";

  return {
    firstName,
    heading: `${firstName}'s workday`,
    summary: isClockedIn
      ? "You are clocked in. Keep an eye on your current shift and exceptions."
      : "Review your next shift, clock in when ready, and handle any open items.",
    nextShift,
    clockStatus: input.clockStatus,
    primaryAction: isClockedIn ? "CLOCK_OUT" : "CLOCK_IN",
    cards: [
      {
        title: "Next shift",
        value: nextShift?.title ?? "No upcoming shift",
        detail: nextShift ? formatDashboardDate(nextShift.startsAt) : "Nothing assigned in this view",
        tone: nextShift ? "ready" : "neutral"
      },
      {
        title: "Time clock",
        value: input.clockStatus.status.replace("_", " "),
        detail: input.clockStatus.currentShiftTitle ?? "No active shift selected",
        tone: isClockedIn ? "ready" : "neutral"
      },
      {
        title: "Timecard exceptions",
        value: String(openExceptions.length),
        detail: openExceptions.at(0)?.explanation ?? "No open exceptions",
        tone: openExceptions.length > 0 ? "attention" : "ready"
      }
    ]
  };
}
