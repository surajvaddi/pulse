import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import type { ShiftAssignmentStatus, ShiftClaimStatus, ShiftSlotStatus } from "@pulseshift/domain";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { demoApprovals } from "../demo/demo-data";
import { ShiftClaimService } from "./shift-claim.service";
import { ShiftManagerService } from "./shift-manager.service";
import { demoShiftSlots, ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";

function splitStatuses<TStatus extends string>(value?: string) {
  return value ? (value.split(",").filter(Boolean) as TStatus[]) : [];
}

@Controller("shift-pipeline")
export class ShiftPipelineController {
  constructor(
    @Inject(ShiftPipelineRepositoryProvider) private readonly repositories: ShiftPipelineRepositoryProvider,
    @Inject(ShiftClaimService) private readonly claims: ShiftClaimService,
    @Inject(ShiftManagerService) private readonly managers: ShiftManagerService
  ) {}

  @Get("slots")
  listSlots(
    @CurrentSession() session: DemoSession,
    @Query("unitId") unitId?: string,
    @Query("facilityId") facilityId?: string,
    @Query("statuses") statuses?: string
  ) {
    this.ensureSeeded();
    const parsedStatuses = statuses ? splitStatuses<ShiftSlotStatus>(statuses) : [];
    return this.repositories.repository().listSlots({
      organizationId: session.organizationId,
      ...(unitId ? { unitId } : {}),
      ...(facilityId ? { facilityId } : {}),
      ...(parsedStatuses.length > 0 ? { statuses: parsedStatuses } : {})
    });
  }

  @Get("claims")
  listClaims(
    @CurrentSession() session: DemoSession,
    @Query("slotId") slotId?: string,
    @Query("employeeId") employeeId?: string,
    @Query("statuses") statuses?: string
  ) {
    this.ensureSeeded();
    const parsedStatuses = statuses ? splitStatuses<ShiftClaimStatus>(statuses) : [];
    return this.repositories.repository().listClaims({
      organizationId: session.organizationId,
      ...(slotId ? { slotId } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(parsedStatuses.length > 0 ? { statuses: parsedStatuses } : {})
    });
  }

  @Get("assignments")
  listAssignments(
    @CurrentSession() session: DemoSession,
    @Query("slotId") slotId?: string,
    @Query("employeeId") employeeId?: string,
    @Query("statuses") statuses?: string
  ) {
    this.ensureSeeded();
    const parsedStatuses = statuses ? splitStatuses<ShiftAssignmentStatus>(statuses) : [];
    return this.repositories.repository().listAssignments({
      organizationId: session.organizationId,
      ...(slotId ? { slotId } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(parsedStatuses.length > 0 ? { statuses: parsedStatuses } : {})
    });
  }

  @Get("approvals")
  listApprovals(@CurrentSession() session: DemoSession, @Query("status") status?: "PENDING" | "APPROVED" | "DENIED") {
    this.ensureSeeded();
    return demoApprovals.filter(
      (approval) =>
        approval.targetObjectType === "ShiftSlot" &&
        (!status || approval.status === status) &&
        (approval.requestedByUserId === session.userId || approval.approverUserId === session.userId || session.role !== "EMPLOYEE")
    );
  }

  @Post("slots/:slotId/claim")
  claimSlot(@CurrentSession() session: DemoSession, @Param("slotId") slotId: string) {
    this.ensureSeeded();
    return this.claims.claimOpenSlot(session, slotId);
  }

  @Post("claims/:claimId/cancel")
  cancelClaim(@CurrentSession() session: DemoSession, @Param("claimId") claimId: string) {
    this.ensureSeeded();
    return this.claims.cancelClaim(session, claimId);
  }

  @Post("claims/:claimId/approve")
  approveClaim(
    @CurrentSession() session: DemoSession,
    @Param("claimId") claimId: string,
    @Body() body: { reason?: string }
  ) {
    this.ensureSeeded();
    return this.managers.decidePendingClaim(session, claimId, "approve", body.reason);
  }

  @Post("claims/:claimId/deny")
  denyClaim(
    @CurrentSession() session: DemoSession,
    @Param("claimId") claimId: string,
    @Body() body: { reason?: string }
  ) {
    this.ensureSeeded();
    return this.managers.decidePendingClaim(session, claimId, "deny", body.reason);
  }

  @Post("slots/:slotId/assign")
  assignSlot(
    @CurrentSession() session: DemoSession,
    @Param("slotId") slotId: string,
    @Body() body: { userId?: string; overrideReason?: string }
  ) {
    this.ensureSeeded();
    return this.managers.directAssignSlot(session, slotId, body.userId ?? "user_maya", {
      ...(body.overrideReason ? { overrideReason: body.overrideReason } : {})
    });
  }

  private ensureSeeded() {
    if (demoShiftSlots.length === 0) {
      seedDemoShiftPipelineState();
    }
  }
}
