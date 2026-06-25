import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { assertShiftCoverageInvariants, assertShiftSwapInvariants } from "@pulseshift/domain";
import type { ShiftSwapRequestContract } from "@pulseshift/domain";

import { demoApprovals, type DemoApprovalRecord } from "../demo/demo-data";
import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";
import { recordShiftPipelineEvent } from "./shift-pipeline-events";
import { ShiftSwapEligibilityService } from "./shift-swap-eligibility.service";
import {
  ShiftSwapRepositoryProvider,
  demoShiftSwapRequests
} from "./shift-swap.repository";
import { prisma } from "@pulseshift/db";

export { demoShiftSwapRequests } from "./shift-swap.repository";

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
    @Inject(ShiftPipelineRepositoryProvider) private readonly repositories: ShiftPipelineRepositoryProvider,
    @Inject(ShiftSwapRepositoryProvider)
    private readonly swapRepositories: ShiftSwapRepositoryProvider
  ) {}

  listSwapRequests(session: DemoSession, status?: ShiftSwapRequestContract["status"]) {
    return this.swapRepositories.repository().list({
      organizationId: session.organizationId,
      ...(status ? { status } : {}),
      ...(!this.canApproveAnySwap(session) ? { userId: session.userId } : {})
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

    const duplicate = (await this.swapRepositories.repository().list({
      organizationId: session.organizationId,
      userId: session.userId
    })).find(
      (swap) =>
        swap.originalSlotId === input.originalSlotId &&
        swap.proposedUserId === input.proposedUserId &&
        ACTIVE_SWAP_STATUSES.includes(swap.status)
    );
    if (duplicate) {
      throw new BadRequestException("An active swap request already exists for this shift and candidate.");
    }

    const swap = await this.swapRepositories.repository().create({
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
    });
    assertShiftSwapInvariants({ swap, originalShift });
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
    const swap = await this.findSwap(session.organizationId, swapId);
    if (swap.proposedUserId !== session.userId) {
      throw new ForbiddenException("Only the proposed counterpart can respond to this swap.");
    }
    if (swap.status !== "PENDING_COUNTERPARTY") {
      throw new BadRequestException("Swap is not waiting for counterpart response.");
    }

    if (input.decision === "decline") {
      const denied = await this.swapRepositories.repository().update({
        organizationId: session.organizationId,
        id: swap.id,
        status: "DENIED",
        decidedAt: new Date().toISOString()
      });
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
      return denied;
    }

    const approval =
      process.env.WORKFLOW_PERSISTENCE === "prisma"
        ? await prisma.approvalRequest.create({
            data: {
              organizationId: session.organizationId,
              requestedByUserId: swap.requesterUserId,
              approvalType: "SHIFT_SWAP",
              targetObjectType: "ShiftSwapRequest",
              targetObjectId: swap.id,
              slotId: swap.originalSlotId,
              managerScope: { type: "UNIT", unitIds: [swap.unitId] },
              riskFlags: swap.policyDecision.riskFlags
            }
          })
        : this.createApproval(session, swap);
    const accepted = await this.swapRepositories.repository().update({
      organizationId: session.organizationId,
      id: swap.id,
      status: "PENDING_MANAGER",
      approvalRequestId: approval.id
    });
    assertShiftSwapInvariants({ swap: accepted, originalShift: this.eligibility.evaluateOriginalShift(session, swap.originalSlotId).originalShift });
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
    return accepted;
  }

  async decideSwap(session: DemoSession, swapId: string, input: DecideSwapInput) {
    const swap = await this.findSwap(session.organizationId, swapId);
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
    if (process.env.WORKFLOW_PERSISTENCE === "prisma") {
      return this.decidePersistedSwap(session, swap, input);
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

  private async decidePersistedSwap(
    session: DemoSession,
    swap: ShiftSwapRequestContract,
    input: DecideSwapInput
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const current = await tx.shiftSwapRequest.findFirst({
            where: {
              id: swap.id,
              organizationId: session.organizationId,
              status: "PENDING_MANAGER"
            }
          });
          if (!current?.approvalRequestId) {
            throw new NotFoundException("Swap approval request not found.");
          }
          const approval = await tx.approvalRequest.findFirst({
            where: {
              id: current.approvalRequestId,
              organizationId: session.organizationId,
              status: "PENDING"
            }
          });
          if (!approval) {
            throw new NotFoundException("Swap approval request not found.");
          }
          if (!current.originalSlotId) {
            throw new BadRequestException(
              "Canonical swap is missing its original shift slot."
            );
          }
          const decidedAt = new Date();
          if (input.decision === "deny") {
            const [deniedSwap, deniedApproval] = await Promise.all([
              tx.shiftSwapRequest.update({
                where: { id: current.id },
                data: { status: "DENIED", decidedAt }
              }),
              tx.approvalRequest.update({
                where: { id: approval.id },
                data: {
                  status: "DENIED",
                  approverUserId: session.userId,
                  decisionReason: input.reason ?? null,
                  decidedAt
                }
              })
            ]);
            await tx.auditLog.create({
              data: {
                organizationId: session.organizationId,
                actorUserId: session.userId,
                actorType: "USER",
                action: "shift_pipeline.swap.denied",
                objectType: "ShiftSwapRequest",
                objectId: current.id,
                reason: input.reason ?? null,
                after: { approvalId: approval.id }
              }
            });
            return {
              status: "DENIED" as const,
              swap: deniedSwap,
              approval: deniedApproval
            };
          }

          const activeAssignment = await tx.shiftAssignment.findFirst({
            where: {
              slotId: current.originalSlotId,
              employeeId: current.requesterEmployeeId,
              status: "ACTIVE"
            }
          });
          if (!activeAssignment || !current.proposedEmployeeId) {
            throw new BadRequestException(
              "Original shift assignment is no longer available for swap."
            );
          }
          const competingAssignment = await tx.shiftAssignment.findFirst({
            where: {
              slotId: current.originalSlotId,
              status: "ACTIVE",
              id: { not: activeAssignment.id }
            }
          });
          if (competingAssignment) {
            throw new BadRequestException(
              "Shift assignment changed before swap approval."
            );
          }
          await tx.shiftAssignment.update({
            where: { id: activeAssignment.id },
            data: { status: "SUPERSEDED", endedAt: decidedAt }
          });
          const assignment = await tx.shiftAssignment.create({
            data: {
              organizationId: session.organizationId,
              slotId: current.originalSlotId,
              employeeId: current.proposedEmployeeId,
              assignedByUserId: session.userId,
              status: "ACTIVE",
              source: "SWAP"
            }
          });
          const approvedSwap = await tx.shiftSwapRequest.update({
            where: { id: current.id },
            data: {
              status: "APPROVED",
              assignmentId: assignment.id,
              decidedAt
            }
          });
          const approved = await tx.approvalRequest.update({
            where: { id: approval.id },
            data: {
              status: "APPROVED",
              approverUserId: session.userId,
              decisionReason: input.reason ?? null,
              decidedAt
            }
          });
          await tx.shiftSlot.update({
            where: { id: current.originalSlotId },
            data: {
              status: "ASSIGNED",
              riskFlags: current.riskFlags
            }
          });
          await tx.auditLog.create({
            data: {
              organizationId: session.organizationId,
              actorUserId: session.userId,
              actorType: "USER",
              action: "shift_pipeline.swap.approved",
              objectType: "ShiftSwapRequest",
              objectId: current.id,
              reason: input.reason ?? null,
              after: {
                approvalId: approval.id,
                assignmentId: assignment.id
              }
            }
          });
          return {
            status: "APPROVED" as const,
            swap: approvedSwap,
            approval: approved,
            assignment
          };
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2034"
      ) {
        throw new BadRequestException(
          "Swap approval conflicted with another assignment. Refresh and retry."
        );
      }
      throw error;
    }
  }

  private async findSwap(organizationId: string, swapId: string) {
    const swap = await this.swapRepositories.repository().find({ organizationId, swapId });
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
