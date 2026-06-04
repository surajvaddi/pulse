import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { SchedulingWorkflowService } from "./scheduling-workflow.service";

@Controller("workflows")
export class SchedulingWorkflowController {
  constructor(@Inject(SchedulingWorkflowService) private readonly workflows: SchedulingWorkflowService) {}

  @Get("swaps")
  listSwaps(@CurrentSession() session: DemoSession) {
    return this.workflows.listSwaps(session);
  }

  @Get("open-shifts")
  listOpenShifts(@CurrentSession() session: DemoSession) {
    return this.workflows.listOpenShifts(session);
  }

  @Post("open-shifts/:shiftId/claim")
  claimOpenShift(@CurrentSession() session: DemoSession, @Param("shiftId") shiftId: string) {
    return this.workflows.claimOpenShift(session, shiftId);
  }

  @Post("swaps")
  createSwap(
    @CurrentSession() session: DemoSession,
    @Body() body: { originalShiftId?: string; proposedUserId?: string }
  ) {
    return this.workflows.createSwapRequest(
      session,
      body.originalShiftId ?? "shift_priya_friday_icu_night",
      body.proposedUserId ?? "user_maya"
    );
  }

  @Post("swaps/:swapId/accept")
  acceptSwap(@CurrentSession() session: DemoSession, @Param("swapId") swapId: string) {
    return this.workflows.respondToSwap(session, swapId, "accept");
  }

  @Post("swaps/:swapId/decline")
  declineSwap(@CurrentSession() session: DemoSession, @Param("swapId") swapId: string) {
    return this.workflows.respondToSwap(session, swapId, "decline");
  }

  @Post("swaps/:swapId/approve")
  approveSwap(
    @CurrentSession() session: DemoSession,
    @Param("swapId") swapId: string,
    @Body() body: { reason?: string }
  ) {
    return this.workflows.decideSwap(session, swapId, "approve", body.reason);
  }

  @Post("swaps/:swapId/deny")
  denySwap(
    @CurrentSession() session: DemoSession,
    @Param("swapId") swapId: string,
    @Body() body: { reason?: string }
  ) {
    return this.workflows.decideSwap(session, swapId, "deny", body.reason);
  }
}
