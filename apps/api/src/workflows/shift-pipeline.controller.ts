import { BadRequestException, Body, Controller, ForbiddenException, Get, Inject, Param, Post, Query } from "@nestjs/common";
import type { ShiftAssignmentStatus, ShiftClaimStatus, ShiftSlotStatus } from "@pulseshift/domain";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { WorkspaceContextService } from "../auth/workspace-context.service";
import { scopeQueryForSession } from "../auth/scope-query";
import { demoApprovals } from "../demo/demo-data";
import { demoEmployeeByUserId } from "../demo/demo-data";
import { prisma } from "@pulseshift/db";
import { ShiftClaimService } from "./shift-claim.service";
import { ShiftManagerService } from "./shift-manager.service";
import { demoShiftSlots, ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";

function splitStatuses<TStatus extends string>(value?: string) {
  return value ? (value.split(",").filter(Boolean) as TStatus[]) : [];
}

function usePrismaWorkflow() {
  return process.env.WORKFLOW_PERSISTENCE === "prisma";
}

@Controller("shift-pipeline")
export class ShiftPipelineController {
  constructor(
    @Inject(ShiftPipelineRepositoryProvider) private readonly repositories: ShiftPipelineRepositoryProvider,
    @Inject(ShiftClaimService) private readonly claims: ShiftClaimService,
    @Inject(ShiftManagerService) private readonly managers: ShiftManagerService,
    @Inject(WorkspaceContextService)
    private readonly workspaceContext: WorkspaceContextService
  ) {}

  @Get("slots")
  async listSlots(
    @CurrentSession() session: DemoSession,
    @Query("unitId") unitId?: string,
    @Query("facilityId") facilityId?: string,
    @Query("statuses") statuses?: string
  ) {
    this.ensureSeeded();
    const parsedStatuses = statuses ? splitStatuses<ShiftSlotStatus>(statuses) : [];
    const query = scopeQueryForSession(
      session,
      await this.workspaceContext.getContext(session),
      "schedule"
    );
    this.assertRequestedScope(query, {
      ...(unitId ? { unitId } : {}),
      ...(facilityId ? { facilityId } : {})
    });
    return this.repositories.repository().listSlots({
      organizationId: query.organizationId,
      ...(query.unitId ? { unitId: query.unitId } : {}),
      ...(query.facilityId ? { facilityId: query.facilityId } : {}),
      ...(parsedStatuses.length > 0 ? { statuses: parsedStatuses } : {})
    });
  }

  @Get("claims")
  async listClaims(
    @CurrentSession() session: DemoSession,
    @Query("slotId") slotId?: string,
    @Query("employeeId") employeeId?: string,
    @Query("statuses") statuses?: string
  ) {
    this.ensureSeeded();
    const parsedStatuses = statuses ? splitStatuses<ShiftClaimStatus>(statuses) : [];
    const repository = this.repositories.repository();
    const query = scopeQueryForSession(
      session,
      await this.workspaceContext.getContext(session),
      "approvals"
    );
    const allowedSlots = await repository.listSlots({
      organizationId: query.organizationId,
      ...(query.unitId ? { unitId: query.unitId } : {}),
      ...(query.facilityId ? { facilityId: query.facilityId } : {})
    });
    const allowedSlotIds = new Set(allowedSlots.map((slot) => slot.id));
    const claims = await repository.listClaims({
      organizationId: session.organizationId,
      ...(slotId ? { slotId } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(parsedStatuses.length > 0 ? { statuses: parsedStatuses } : {})
    });
    return claims.filter(
      (claim) =>
        allowedSlotIds.has(claim.slotId) &&
        (!query.userId || claim.userId === query.userId)
    );
  }

  @Get("assignments")
  async listAssignments(
    @CurrentSession() session: DemoSession,
    @Query("slotId") slotId?: string,
    @Query("employeeId") employeeId?: string,
    @Query("statuses") statuses?: string
  ) {
    this.ensureSeeded();
    const parsedStatuses = statuses ? splitStatuses<ShiftAssignmentStatus>(statuses) : [];
    const repository = this.repositories.repository();
    const query = scopeQueryForSession(
      session,
      await this.workspaceContext.getContext(session),
      "schedule"
    );
    const allowedSlots = await repository.listSlots({
      organizationId: query.organizationId,
      ...(query.unitId ? { unitId: query.unitId } : {}),
      ...(query.facilityId ? { facilityId: query.facilityId } : {})
    });
    const allowedSlotIds = new Set(allowedSlots.map((slot) => slot.id));
    const assignments = await repository.listAssignments({
      organizationId: session.organizationId,
      ...(slotId ? { slotId } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(parsedStatuses.length > 0 ? { statuses: parsedStatuses } : {})
    });
    const scopedEmployeeId = query.userId
      ? await this.employeeIdForUser(query.userId)
      : undefined;
    return assignments.filter(
      (assignment) =>
        allowedSlotIds.has(assignment.slotId) &&
        (!query.userId || assignment.employeeId === scopedEmployeeId)
    );
  }

  @Get("approvals")
  async listApprovals(@CurrentSession() session: DemoSession, @Query("status") status?: "PENDING" | "APPROVED" | "DENIED") {
    this.ensureSeeded();
    if (usePrismaWorkflow()) {
      const context = await this.workspaceContext.getContext(session);
      const query = scopeQueryForSession(session, context, "approvals");
      return prisma.approvalRequest.findMany({
        where: {
          organizationId: query.organizationId,
          approvalType: "SHIFT_ASSIGNMENT",
          ...(status ? { status } : {}),
          ...(query.unitId
            ? {
                managerScope: {
                  path: ["unitIds"],
                  array_contains: query.unitId
                }
              }
            : {})
        },
        orderBy: { createdAt: "desc" }
      });
    }
    const repository = this.repositories.repository();
    const query = scopeQueryForSession(
      session,
      await this.workspaceContext.getContext(session),
      "approvals"
    );
    const allowedSlots = await repository.listSlots({
      organizationId: query.organizationId,
      ...(query.unitId ? { unitId: query.unitId } : {}),
      ...(query.facilityId ? { facilityId: query.facilityId } : {})
    });
    const allowedSlotIds = new Set(allowedSlots.map((slot) => slot.id));
    return demoApprovals.filter(
      (approval) =>
        approval.targetObjectType === "ShiftSlot" &&
        allowedSlotIds.has(approval.targetObjectId) &&
        (!status || approval.status === status) &&
        (approval.requestedByUserId === session.userId || approval.approverUserId === session.userId || session.role !== "EMPLOYEE")
    );
  }

  @Post("slots/:slotId/claim")
  claimSlot(@CurrentSession() session: DemoSession, @Param("slotId") slotId: string) {
    this.ensureSeeded();
    return this.claims.claimOpenSlot(session, slotId);
  }

  @Get("slots/:slotId/candidates")
  listAssignmentCandidates(
    @CurrentSession() session: DemoSession,
    @Param("slotId") slotId: string
  ) {
    this.ensureSeeded();
    return this.managers.listAssignmentCandidates(session, slotId);
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
    if (!body.userId) {
      throw new BadRequestException("Direct assignment requires an assignee user id.");
    }
    return this.managers.directAssignSlot(session, slotId, body.userId, {
      ...(body.overrideReason ? { overrideReason: body.overrideReason } : {})
    });
  }

  private ensureSeeded() {
    if (!usePrismaWorkflow() && demoShiftSlots.length === 0) {
      seedDemoShiftPipelineState();
    }
  }

  private assertRequestedScope(
    query: { facilityId?: string; unitId?: string },
    requested: { facilityId?: string; unitId?: string }
  ) {
    if (
      (requested.unitId && requested.unitId !== query.unitId) ||
      (requested.facilityId && requested.facilityId !== query.facilityId)
    ) {
      throw new ForbiddenException(
        "Requested filters are outside the active workspace context."
      );
    }
  }

  private async employeeIdForUser(userId: string) {
    if (!usePrismaWorkflow()) {
      return demoEmployeeByUserId.get(userId);
    }
    return (
      await prisma.employeeProfile.findUnique({
        where: { userId },
        select: { id: true }
      })
    )?.id;
  }
}
