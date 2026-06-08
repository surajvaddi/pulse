import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import type { ShiftSwapRequestContract } from "@pulseshift/domain";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { ShiftSwapEligibilityService } from "./shift-swap-eligibility.service";
import { ShiftSwapService } from "./shift-swap.service";

@Controller("swap-pipeline")
export class ShiftSwapPipelineController {
  constructor(
    @Inject(ShiftSwapEligibilityService) private readonly eligibility: ShiftSwapEligibilityService,
    @Inject(ShiftSwapService) private readonly swaps: ShiftSwapService
  ) {}

  @Get("eligible-original-shifts")
  listEligibleOriginalShifts(@CurrentSession() session: DemoSession) {
    return this.eligibility.listSwappableShifts(session);
  }

  @Get("shifts/:slotId/eligibility")
  getOriginalShiftEligibility(@CurrentSession() session: DemoSession, @Param("slotId") slotId: string) {
    return this.eligibility.evaluateOriginalShift(session, slotId);
  }

  @Get("shifts/:slotId/candidates")
  listCandidates(@CurrentSession() session: DemoSession, @Param("slotId") slotId: string) {
    return this.eligibility.listCandidates(session, slotId);
  }

  @Get("swaps")
  listSwaps(@CurrentSession() session: DemoSession, @Query("status") status?: ShiftSwapRequestContract["status"]) {
    return this.swaps.listSwapRequests(session, status);
  }

  @Post("swaps")
  createSwap(
    @CurrentSession() session: DemoSession,
    @Body() body: { originalSlotId?: string; proposedUserId?: string }
  ) {
    return this.swaps.createSwapRequest(session, {
      originalSlotId: body.originalSlotId ?? "",
      proposedUserId: body.proposedUserId ?? ""
    });
  }

  @Post("swaps/:swapId/respond")
  respondToSwap(
    @CurrentSession() session: DemoSession,
    @Param("swapId") swapId: string,
    @Body() body: { decision?: "accept" | "decline"; reason?: string }
  ) {
    return this.swaps.respondToSwap(session, swapId, {
      decision: body.decision ?? "decline",
      ...(body.reason ? { reason: body.reason } : {})
    });
  }

  @Post("swaps/:swapId/decide")
  decideSwap(
    @CurrentSession() session: DemoSession,
    @Param("swapId") swapId: string,
    @Body() body: { decision?: "approve" | "deny"; reason?: string }
  ) {
    return this.swaps.decideSwap(session, swapId, {
      decision: body.decision ?? "deny",
      ...(body.reason ? { reason: body.reason } : {})
    });
  }
}
