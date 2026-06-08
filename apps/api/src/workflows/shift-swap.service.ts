import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { assertShiftCoverageInvariants, assertShiftSwapInvariants } from "@pulseshift/domain";
import type { ShiftSwapRequestContract } from "@pulseshift/domain";

import { demoApprovals, type DemoApprovalRecord } from "../demo/demo-data";
import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";
import { recordShiftPipelineEvent } from "./shift-pipeline-events";
import { ShiftSwapEligibilityService } from "./shift-swap-eligibility.service";

export const demoShiftSwapRequests: ShiftSwapRequestContract[] = [];

export type CreateSwapRequestInput = {
  originalSlotId: string;
  proposedUserId: string;
};

export type RespondToSwapInput = {
  decision: "accept" | "decline";
  reason?: string;
};

export type DecideSwapInput = {
  decision: "approve" | "deny";
  reason?: string;
};

const ACTIVE_SWAP_STATUSES: ShiftSwapRequestContract["status"][] = [
  "PENDING_COUNTERPARTY",
  "PENDING_MANAGER",
  "APPROVED"
];

@Injectable()
export class ShiftSwapService {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(ShiftSwapEligibilityService) private readonly eligibility: ShiftSwapEligibilityService,
    @Inject(ShiftPipelineRepositoryProvider) private readonly repositories: ShiftPipelineRepositoryProvider
  ) {}

  listSwapRequests(session: DemoSession, status?: ShiftSwapRequestContract["status"]) {
    return demoShiftSwapRequests.filter((swap) => {
      if (swap.organizationId !== session.organizationId) {
        return false;
      }
      if (status && swap.status !== status) {
        return false;
      }
      if (this.canApproveAnySwap(session)) {
        return true;
      }
      return swap.requesterUserId === session.userId || swap.proposedUserId === session.userId;
    });
  }

  async createSwapRequest(session: DemoSession, input: CreateSwapRequestInput) {
    if (!this.permissions.hasPermission(session, "shift:swap:create", { type: "SELF", userId: session.userId })) {
      throw new ForbiddenException("User is not allowed to create shift swap requests.");
    }

    const { originalShift, decision } = this.eligibility.evaluateOriginalShift(session, input.originalSlotId);
    if (!decision.allowed) {
      throw new BadRequestException({ message: "Original shift is not eligible for swap.", decision });
    }

    const candidate = this.eligibility.evaluateCandidate(session, originalShift, input.proposedUserId);
    if (!candidate.eligible) {
      throw new BadRequestException({ message: "Proposed swap candidate is not eligible.", candidate });
    }

    const duplicate = demoShiftSwapRequests.find(
      (swap) =>
        swap.organizationId === session.organizationId &&
        swap.originalSlotId === input.originalSlotId &&
        swap.requesterUserId === session.userId &&
        swap.proposedUserId === input.proposedUserId &&
        ACTIVE_SWAP_STATUSES.includes(swap.status)
    );
    if (duplicate) {
      throw new BadRequestException("An active swap request already exists for this shift and candidate.");
    }

    const swap: ShiftSwapRequestContract = {
      id: `swap_${demoShiftSwapRequests.length + 1}`,
      organizationId: session.organizationId,
      originalSlotId: input.originalSlotId,
      requesterEmployeeId: originalShift.employeeId ?? "",
      requesterUserId: session.userId,
      proposedEmployeeId: candidate.employeeId,
      proposedUserId: input.proposedUserId,
      unitId: originalShift.unitId,
      status: "PENDING_COUNTERPARTY",
      policyDecision: {
        allowed: candidate.eligible,
        requiresApproval: candidate.requiresApproval,
        riskFlags: candidate.riskFlags,
        blockingReasons: candidate.blockingReasons,
        warnings: candidate.warnings,
        evaluatedAt: candidate.evaluatedAt
      },
      managerApprovalRequired: true,
      createdAt: new Date().toISOString()
    };
    assertShiftSwapInvariants({ swap, originalShift });
    demoShiftSwapRequests.push(swap);
    recordShiftPipelineEvent({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "shift_pipeline.swap.requested",
      objectType: "ShiftSwapRequest",
      objectId: swap.id,
      after: { originalSlotId: input.originalSlotId, proposedUserId: input.proposedUserId },
      notifyUserId: input.proposedUserId,
      notificationType: "SHIFT_SWAP_REQUESTED"
    });
    return swap;
  }

  async respondToSwap(session: DemoSession, swapId: string, input: RespondToSwapInput) {
    const swap = this.findSwap(session.organizationId, swapId);
    if (swap.proposedUserId !== session.userId) {
      throw new ForbiddenException("Only the proposed counterpart can respond to this swap.");
    }
    if (swap.status !== "PENDING_COUNTERPARTY") {
      throw new BadRequestException("Swap is not waiting for counterpart response.");
    }

    if (input.decision === "decline") {
      swap.status = "DENIED";
      swap.decidedAt = new Date().toISOString();
      recordShiftPipelineEvent({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        action: "shift_pipeline.swap.declined",
        objectType: "ShiftSwapRequest",
        objectId: swap.id,
        ...(input.reason ? { reason: input.reason } : {}),
        after: { originalSlotId: swap.originalSlotId },
        notifyUserId: swap.requesterUserId,
        notificationType: "SHIFT_SWAP_DECLINED"
      });
      return swap;
    }

    const approval = this.createApproval(session, swap);
    swap.status = "PENDING_MANAGER";
    swap.approvalRequestId = approval.id;
    assertShiftSwapInvariants({ swap, originalShift: this.eligibility.evaluateOriginalShift(session, swap.originalSlotId).originalShift });
    recordShiftPipelineEvent({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "shift_pipeline.swap.accepted",
      objectType: "ShiftSwapRequest",
      objectId: swap.id,
      after: { approvalRequestId: approval.id, originalSlotId: swap.originalSlotId },
      notifyUserId: "user_jordan_manager",
      notificationType: "SHIFT_SWAP_APPROVAL_REQUIRED"
    });
    return swap;
  }

  async decideSwap(session: DemoSession, swapId: string, input: DecideSwapInput) {
    const swap = this.findSwap(session.organizationId, swapId);
    if (swap.status !== "PENDING_MANAGER") {
      throw new BadRequestException("Swap is not waiting for manager decision.");
    }

    const repository = this.repositories.repository();
    const slot = await repository.findSlot({ organizationId: session.organizationId, slotId: swap.originalSlotId });
    if (!slot) {
      throw new NotFoundException("Swap shift slot not found.");
    }
    if (!this.permissions.hasPermission(session, "shift:swap:approve", { type: "UNIT", unitId: slot.unitId })) {
      throw new ForbiddenException("User is not allowed to approve swaps for this unit.");
    }

    const approval = this.findApproval(swap);
    approval.approverUserId = session.userId;
    if (input.reason) {
      approval.decisionReason = input.reason;
    }

    if (input.decision === "deny") {
      approval.status = "DENIED";
      swap.status = "DENIED";
      swap.decidedAt = new Date().toISOString();
      recordShiftPipelineEvent({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        action: "shift_pipeline.swap.denied",
        objectType: "ShiftSwapRequest",
        objectId: swap.id,
        ...(input.reason ? { reason: input.reason } : {}),
        after: { approvalRequestId: approval.id, originalSlotId: swap.originalSlotId },
        notifyUserId: swap.requesterUserId,
        notificationType: "SHIFT_SWAP_DENIED"
      });
      return { status: "DENIED" as const, swap, approval };
    }

    const activeAssignment = await repository.findActiveAssignmentForSlot({
      organizationId: session.organizationId,
      slotId: swap.originalSlotId
    });
    if (!activeAssignment || activeAssignment.employeeId !== swap.requesterEmployeeId) {
      throw new BadRequestException("Original shift assignment is no longer available for swap.");
    }

    const decidedAt = new Date().toISOString();
    await repository.updateAssignment({
      organizationId: session.organizationId,
      assignmentId: activeAssignment.id,
      status: "SUPERSEDED",
      endedAt: decidedAt
    });
    const assignment = await repository.createAssignment({
      organizationId: session.organizationId,
      slotId: swap.originalSlotId,
      employeeId: swap.proposedEmployeeId,
      assignedByUserId: session.userId,
      status: "ACTIVE",
      source: "SWAP"
    });
    await repository.updateSlotStatus({
      organizationId: session.organizationId,
      slotId: swap.originalSlotId,
      status: "ASSIGNED",
      riskFlags: swap.policyDecision.riskFlags
    });
    approval.status = "APPROVED";
    swap.status = "APPROVED";
    swap.assignmentId = assignment.id;
    swap.decidedAt = decidedAt;
    await this.assertSlotInvariant(session.organizationId, swap.originalSlotId);
    assertShiftSwapInvariants({
      swap,
      originalShift: this.eligibility.evaluateOriginalShift({ ...session, userId: swap.proposedUserId }, swap.originalSlotId).originalShift
    });
    recordShiftPipelineEvent({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "shift_pipeline.swap.approved",
      objectType: "ShiftSwapRequest",
      objectId: swap.id,
      ...(input.reason ? { reason: input.reason } : {}),
      after: { assignmentId: assignment.id, approvalRequestId: approval.id, originalSlotId: swap.originalSlotId },
      notifyUserId: swap.proposedUserId,
      notificationType: "SHIFT_SWAP_APPROVED"
    });
    return { status: "APPROVED" as const, swap, assignment, approval };
  }

  private findSwap(organizationId: string, swapId: string) {
    const swap = demoShiftSwapRequests.find((candidate) => candidate.organizationId === organizationId && candidate.id === swapId);
    if (!swap) {
      throw new NotFoundException("Shift swap request not found.");
    }
    return swap;
  }

  private createApproval(session: DemoSession, swap: ShiftSwapRequestContract) {
    const approval: DemoApprovalRecord = {
      id: `approval_shift_swap_${demoApprovals.length + 1}`,
      approvalType: "SHIFT_SWAP",
      requestedByUserId: session.userId,
      approverUserId: "user_jordan_manager",
      targetObjectType: "ShiftSwapRequest",
      targetObjectId: swap.id,
      status: "PENDING",
      riskFlags: swap.policyDecision.riskFlags
    };
    demoApprovals.push(approval);
    return approval;
  }

  private findApproval(swap: ShiftSwapRequestContract) {
    const approval = demoApprovals.find((candidate) => candidate.id === swap.approvalRequestId);
    if (!approval) {
      throw new NotFoundException("Swap approval request not found.");
    }
    return approval;
  }

  private canApproveAnySwap(session: DemoSession) {
    return session.grants.some((grant) => grant.permission === "shift:swap:approve");
  }

  private async assertSlotInvariant(organizationId: string, slotId: string) {
    const repository = this.repositories.repository();
    const slot = await repository.findSlot({ organizationId, slotId });
    if (!slot) {
      throw new NotFoundException("Shift slot not found while validating swap invariant");
    }
    return assertShiftCoverageInvariants({
      slot,
      assignments: await repository.listAssignments({ organizationId, slotId }),
      claims: await repository.listClaims({ organizationId, slotId })
    });
  }
}
