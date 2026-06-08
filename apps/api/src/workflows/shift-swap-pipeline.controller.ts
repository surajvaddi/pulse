import { Controller, Get, Inject, Param } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { ShiftSwapEligibilityService } from "./shift-swap-eligibility.service";

@Controller("swap-pipeline")
export class ShiftSwapPipelineController {
  constructor(@Inject(ShiftSwapEligibilityService) private readonly eligibility: ShiftSwapEligibilityService) {}

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
}
