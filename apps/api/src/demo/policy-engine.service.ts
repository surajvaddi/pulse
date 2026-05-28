import { Injectable } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import type { DemoShiftRecord, DemoSwapRecord } from "./demo-data";

export type PolicyDecision = {
  id: string;
  action: string;
  allowed: boolean;
  requiresApproval: boolean;
  riskFlags: string[];
  blockingReasons: string[];
  warnings: string[];
};

@Injectable()
export class PolicyEngineService {
  evaluateOpenShiftClaim(session: DemoSession, shift: DemoShiftRecord): PolicyDecision {
    const blockingReasons: string[] = [];
    const riskFlags: string[] = [];
    const warnings: string[] = [];

    if (shift.status !== "OPEN") {
      blockingReasons.push("Shift is not open.");
    }

    if (shift.unitId !== "unit_icu") {
      blockingReasons.push("Shift is outside the current demo unit scope.");
    }

    if (session.userId === "user_priya" && shift.id === "shift_open_icu_night") {
      riskFlags.push("OVERTIME_RISK");
      warnings.push("Claiming this may put Priya above 40 hours this week.");
    }

    return this.decision("CLAIM_OPEN_SHIFT", blockingReasons, riskFlags, warnings);
  }

  evaluateSwapCreation(session: DemoSession, shift: DemoShiftRecord): PolicyDecision {
    const blockingReasons: string[] = [];
    const riskFlags = ["MANAGER_APPROVAL_REQUIRED"];
    const warnings = ["Published ICU shift swaps require counterparty acceptance and manager approval."];

    if (shift.userId !== session.userId) {
      blockingReasons.push("Requester can only create swaps for their own assigned shifts.");
    }

    if (shift.status !== "PUBLISHED") {
      blockingReasons.push("Only published shifts are eligible for the MVP swap workflow.");
    }

    return this.decision("CREATE_SHIFT_SWAP", blockingReasons, riskFlags, warnings);
  }

  evaluateSwapApproval(swap: DemoSwapRecord): PolicyDecision {
    const blockingReasons: string[] = [];
    const riskFlags = [...swap.riskFlags];
    const warnings = ["Approval updates the published schedule and notifies both employees."];

    if (swap.status !== "PENDING_MANAGER") {
      blockingReasons.push("Swap is not awaiting manager approval.");
    }

    return this.decision("APPROVE_SHIFT_SWAP", blockingReasons, riskFlags, warnings);
  }

  private decision(
    action: string,
    blockingReasons: string[],
    riskFlags: string[],
    warnings: string[]
  ): PolicyDecision {
    return {
      id: `policy_${action.toLowerCase()}_${Date.now()}`,
      action,
      allowed: blockingReasons.length === 0,
      requiresApproval: riskFlags.length > 0,
      riskFlags,
      blockingReasons,
      warnings
    };
  }
}

