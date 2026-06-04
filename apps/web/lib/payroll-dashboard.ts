import type { TimecardException } from "@/lib/api";

export type PayrollDashboardModel = {
  openExceptions: TimecardException[];
  resolvedExceptions: TimecardException[];
  highestSeverity: string;
  cards: Array<{
    title: string;
    value: string;
    detail: string;
    tone: "neutral" | "ready" | "attention";
  }>;
};

export function buildPayrollDashboard(exceptions: TimecardException[]): PayrollDashboardModel {
  const openExceptions = exceptions.filter((exception) => exception.status !== "RESOLVED");
  const resolvedExceptions = exceptions.filter((exception) => exception.status === "RESOLVED");
  const highestSeverity = openExceptions.at(0)?.severity ?? "NONE";

  return {
    openExceptions,
    resolvedExceptions,
    highestSeverity,
    cards: [
      {
        title: "Open exceptions",
        value: String(openExceptions.length),
        detail: openExceptions.at(0)?.explanation ?? "No payroll exceptions need review",
        tone: openExceptions.length > 0 ? "attention" : "ready"
      },
      {
        title: "Resolved",
        value: String(resolvedExceptions.length),
        detail: "Completed during this review cycle",
        tone: resolvedExceptions.length > 0 ? "ready" : "neutral"
      },
      {
        title: "Highest severity",
        value: highestSeverity,
        detail: highestSeverity === "NONE" ? "Queue is clear" : "Review before payroll export",
        tone: highestSeverity === "NONE" ? "ready" : "attention"
      }
    ]
  };
}
