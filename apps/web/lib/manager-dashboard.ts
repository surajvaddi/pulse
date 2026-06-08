import type {
  AuditLog,
  DemoShift,
  ShiftPipelineApproval,
  ShiftPipelineClaim,
  ShiftPipelineSlot,
  ShiftSwapRequest,
  StaffingGap
} from "@/lib/api";

export type ManagerDashboardCard = {
  title: string;
  value: string;
  detail: string;
  tone: "neutral" | "ready" | "attention";
};

export type ManagerDashboardModel = {
  cards: ManagerDashboardCard[];
  priorityGap: StaffingGap | null;
  pendingSwaps: ShiftSwapRequest[];
  pendingClaims: ShiftPipelineClaim[];
  openSlots: ShiftPipelineSlot[];
  approvals: ShiftPipelineApproval[];
  recentAuditLogs: AuditLog[];
};

function openShiftDetail(openSlots: ShiftPipelineSlot[], legacyOpenShifts: DemoShift[]) {
  const openSlot = openSlots.at(0);
  if (openSlot) {
    return openSlot.roleRequiredId.replaceAll("_", " ");
  }
  return legacyOpenShifts.at(0)?.title ?? "No open unit shifts";
}

export function buildManagerDashboard(input: {
  shifts: DemoShift[];
  gaps: StaffingGap[];
  swaps: ShiftSwapRequest[];
  auditLogs: AuditLog[];
  slots?: ShiftPipelineSlot[];
  claims?: ShiftPipelineClaim[];
  approvals?: ShiftPipelineApproval[];
}): ManagerDashboardModel {
  const pipelineSlots = input.slots ?? [];
  const pipelineClaims = input.claims ?? [];
  const pipelineApprovals = input.approvals ?? [];
  const openSlots = pipelineSlots.filter((slot) => slot.status === "OPEN");
  const legacyOpenShifts = input.shifts.filter((shift) => shift.status === "OPEN");
  const openShiftCount = openSlots.length > 0 ? openSlots.length : legacyOpenShifts.length;
  const pendingSwaps = input.swaps.filter((swap) => swap.status.includes("PENDING"));
  const pendingClaims = pipelineClaims.filter((claim) => claim.status === "PENDING_APPROVAL");
  const priorityGap =
    [...input.gaps].sort((left, right) => right.gapCount - left.gapCount).at(0) ?? null;
  const riskFlags = [
    ...input.swaps.flatMap((swap) => swap.policyDecision.riskFlags),
    ...pipelineSlots.flatMap((slot) => slot.riskFlags),
    ...pipelineClaims.flatMap((claim) => claim.policyDecision.riskFlags)
  ];
  const pendingApprovalCount = pendingSwaps.length + pendingClaims.length;

  return {
    priorityGap,
    pendingSwaps,
    pendingClaims,
    openSlots,
    approvals: pipelineApprovals,
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
        value: String(pendingApprovalCount),
        detail: pendingClaims.length > 0 ? "Shift claims need review" : pendingSwaps.length > 0 ? "Swap requests need review" : "Approval queue clear",
        tone: pendingApprovalCount > 0 ? "attention" : "ready"
      },
      {
        title: "Open shifts",
        value: String(openShiftCount),
        detail: openShiftDetail(openSlots, legacyOpenShifts),
        tone: openShiftCount > 0 ? "attention" : "ready"
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
