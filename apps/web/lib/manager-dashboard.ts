import type { AuditLog, DemoShift, DemoSwap, StaffingGap } from "@/lib/api";

export type ManagerDashboardCard = {
  title: string;
  value: string;
  detail: string;
  tone: "neutral" | "ready" | "attention";
};

export type ManagerDashboardModel = {
  cards: ManagerDashboardCard[];
  priorityGap: StaffingGap | null;
  pendingSwaps: DemoSwap[];
  recentAuditLogs: AuditLog[];
};

export function buildManagerDashboard(input: {
  shifts: DemoShift[];
  gaps: StaffingGap[];
  swaps: DemoSwap[];
  auditLogs: AuditLog[];
}): ManagerDashboardModel {
  const openShifts = input.shifts.filter((shift) => shift.status === "OPEN");
  const pendingSwaps = input.swaps.filter((swap) => swap.status.includes("PENDING"));
  const priorityGap =
    [...input.gaps].sort((left, right) => right.gapCount - left.gapCount).at(0) ?? null;
  const riskFlags = input.swaps.flatMap((swap) => swap.riskFlags);

  return {
    priorityGap,
    pendingSwaps,
    recentAuditLogs: input.auditLogs.slice(-4).reverse(),
    cards: [
      {
        title: "Coverage gaps",
        value: String(input.gaps.length),
        detail: priorityGap
          ? `${priorityGap.role}: ${priorityGap.gapCount} open spot`
          : "No active staffing gaps",
        tone: input.gaps.length > 0 ? "attention" : "ready"
      },
      {
        title: "Pending approvals",
        value: String(pendingSwaps.length),
        detail: pendingSwaps.length > 0 ? "Swap requests need review" : "Approval queue clear",
        tone: pendingSwaps.length > 0 ? "attention" : "ready"
      },
      {
        title: "Open shifts",
        value: String(openShifts.length),
        detail: openShifts.at(0)?.title ?? "No open unit shifts",
        tone: openShifts.length > 0 ? "attention" : "ready"
      },
      {
        title: "Policy flags",
        value: String(riskFlags.length),
        detail: riskFlags.at(0)?.replaceAll("_", " ") ?? "No swap policy flags",
        tone: riskFlags.length > 0 ? "attention" : "neutral"
      }
    ]
  };
}
