import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@pulseshift/db";
import { assertShiftCoverageInvariants } from "@pulseshift/domain";
import type { ShiftClaimRequestContract } from "@pulseshift/domain";

import { demoApprovals, type DemoApprovalRecord } from "../demo/demo-data";
import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { ShiftEligibilityService } from "./shift-eligibility.service";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";
import { recordShiftPipelineEvent } from "./shift-pipeline-events";

const ACTIVE_CLAIM_STATUSES: ShiftClaimRequestContract["status"][] = [
  "SUBMITTED",
  "PENDING_POLICY_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "ASSIGNED"
];

@Injectable()
export class ShiftClaimService {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(ShiftEligibilityService) private readonly eligibility: ShiftEligibilityService,
    @Inject(ShiftPipelineRepositoryProvider) private readonly repositories: ShiftPipelineRepositoryProvider
  ) {}

  async claimOpenSlot(session: DemoSession, slotId: string) {
    if (!this.permissions.hasPermission(session, "shift:claim", { type: "SELF", userId: session.userId })) {
      throw new BadRequestException("User is not allowed to claim shifts.");
    }

    const repository = this.repositories.repository();
    const slot = await repository.findSlot({ organizationId: session.organizationId, slotId });
    if (!slot) {
      throw new NotFoundException("Shift slot not found");
    }

    const employeeId = await this.employeeIdForSession(session);
    const duplicateClaims = await repository.listClaims({
      organizationId: session.organizationId,
      slotId,
      employeeId,
      statuses: ACTIVE_CLAIM_STATUSES
    });
    if (duplicateClaims.length > 0) {
      throw new BadRequestException("Employee already has an active claim for this shift slot.");
    }

    const policyDecision = this.eligibility.evaluateClaim({ session, slot, employeeId });
    if (!policyDecision.allowed) {
      throw new BadRequestException({
        message: "Shift claim blocked by policy",
        policyDecision
      });
    }

    if (policyDecision.requiresApproval) {
      if (process.env.WORKFLOW_PERSISTENCE === "prisma") {
        return this.createPersistedApprovalClaim(
          session,
          slot,
          employeeId,
          policyDecision
        );
      }
      const approval = this.createApproval(session, slotId, policyDecision.riskFlags);
      const claim = await repository.createClaim({
        organizationId: session.organizationId,
        slotId,
        employeeId,
        userId: session.userId,
        status: "PENDING_APPROVAL",
        approvalRequestId: approval.id,
        policyDecision
      });
      const updatedSlot = await repository.updateSlotStatus({
        organizationId: session.organizationId,
        slotId,
        status: "CLAIM_PENDING",
        riskFlags: policyDecision.riskFlags
      });
      await this.assertSlotInvariant(session.organizationId, updatedSlot.id);
      recordShiftPipelineEvent({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        action: "shift_pipeline.claim.pending_approval",
        objectType: "ShiftClaimRequest",
        objectId: claim.id,
        after: { slotId, approvalRequestId: approval.id, policyDecision },
        notifyUserId: "user_jordan_manager",
        notificationType: "SHIFT_CLAIM_APPROVAL_REQUIRED"
      });
      return { status: "PENDING_APPROVAL" as const, slot: updatedSlot, claim, approval, policyDecision };
    }

    const assignment = await repository.createAssignment({
      organizationId: session.organizationId,
      slotId,
      employeeId,
      assignedByUserId: session.userId,
      status: "ACTIVE",
      source: "CLAIM"
    });
    const claim = await repository.createClaim({
      organizationId: session.organizationId,
      slotId,
      employeeId,
      userId: session.userId,
      status: "ASSIGNED",
      assignmentId: assignment.id,
      policyDecision
    });
    const updatedSlot = await repository.updateSlotStatus({
      organizationId: session.organizationId,
      slotId,
      status: "ASSIGNED",
      riskFlags: policyDecision.riskFlags
    });
    await this.assertSlotInvariant(session.organizationId, updatedSlot.id);
    recordShiftPipelineEvent({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "shift_pipeline.claim.assigned",
      objectType: "ShiftClaimRequest",
      objectId: claim.id,
      after: { slotId, assignmentId: assignment.id, policyDecision },
      notifyUserId: session.userId,
      notificationType: "SHIFT_CLAIM_ASSIGNED"
    });
    return { status: "ASSIGNED" as const, slot: updatedSlot, claim, assignment, policyDecision };
  }

  async cancelClaim(session: DemoSession, claimId: string) {
    const repository = this.repositories.repository();
    const [claim] = await repository.listClaims({
      organizationId: session.organizationId,
      statuses: ACTIVE_CLAIM_STATUSES
    }).then((claims) => claims.filter((candidate) => candidate.id === claimId));

    if (!claim) {
      throw new NotFoundException("Active shift claim not found");
    }
    if (claim.userId !== session.userId) {
      throw new BadRequestException("Only the claim owner can cancel this claim.");
    }
    if (claim.status === "ASSIGNED") {
      throw new BadRequestException("Assigned claims cannot be cancelled from the employee claim flow.");
    }

    const cancelledClaim = await repository.updateClaim({
      organizationId: session.organizationId,
      claimId,
      status: "CANCELLED",
      decidedAt: new Date().toISOString()
    });
    const slot = await repository.findSlot({ organizationId: session.organizationId, slotId: claim.slotId });
    if (slot?.status === "CLAIM_PENDING") {
      await repository.updateSlotStatus({
        organizationId: session.organizationId,
        slotId: slot.id,
        status: "OPEN",
        riskFlags: slot.riskFlags
      });
    }
    await this.assertSlotInvariant(session.organizationId, claim.slotId);
    recordShiftPipelineEvent({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "shift_pipeline.claim.cancelled",
      objectType: "ShiftClaimRequest",
      objectId: cancelledClaim.id,
      after: { slotId: claim.slotId, status: cancelledClaim.status },
      notifyUserId: session.userId,
      notificationType: "SHIFT_CLAIM_CANCELLED"
    });
    return cancelledClaim;
  }

  private async employeeIdForSession(session: DemoSession) {
    if (process.env.WORKFLOW_PERSISTENCE === "prisma") {
      const employee = await prisma.employeeProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true }
      });
      if (!employee) {
        throw new BadRequestException("User does not have a claimable employee profile.");
      }
      return employee.id;
    }
    const employeeIdByUserId: Record<string, string> = {
      user_priya: "emp_priya",
      user_maya: "emp_maya",
      user_olivia_charge: "emp_olivia",
      user_aria_agency: "emp_aria"
    };
    const employeeId = employeeIdByUserId[session.userId];
    if (!employeeId) {
      throw new BadRequestException("User does not have a claimable employee profile.");
    }
    return employeeId;
  }

  private createApproval(session: DemoSession, slotId: string, riskFlags: string[]) {
    const approval: DemoApprovalRecord = {
      id: `approval_shift_claim_${demoApprovals.length + 1}`,
      approvalType: "SHIFT_ASSIGNMENT",
      requestedByUserId: session.userId,
      approverUserId: "user_jordan_manager",
      targetObjectType: "ShiftSlot",
      targetObjectId: slotId,
      status: "PENDING",
      riskFlags
    };
    demoApprovals.push(approval);
    return approval;
  }

  private async createPersistedApprovalClaim(
    session: DemoSession,
    slot: {
      id: string;
      organizationId: string;
      facilityId: string;
      unitId: string;
      roleRequiredId: string;
      certificationRequiredIds: string[];
      startsAt: string;
      endsAt: string;
      status: string;
      source: string;
      riskFlags: string[];
    },
    employeeId: string,
    policyDecision: ShiftClaimRequestContract["policyDecision"]
  ) {
    const manager = await prisma.unit.findFirst({
      where: {
        id: slot.unitId,
        facility: { organizationId: session.organizationId }
      },
      select: { managerUserIds: true }
    });
    const approverUserId = manager?.managerUserIds.at(0);
    const result = await prisma.$transaction(
      async (tx) => {
        const activeClaim = await tx.shiftClaimRequest.findFirst({
          where: {
            organizationId: session.organizationId,
            slotId: slot.id,
            employeeId,
            status: {
              in: [
                "SUBMITTED",
                "PENDING_POLICY_REVIEW",
                "PENDING_APPROVAL",
                "APPROVED",
                "ASSIGNED"
              ]
            }
          }
        });
        if (activeClaim) {
          throw new BadRequestException(
            "Employee already has an active claim for this shift slot."
          );
        }
        const currentSlot = await tx.shiftSlot.findFirst({
          where: {
            id: slot.id,
            organizationId: session.organizationId,
            status: "OPEN"
          }
        });
        if (!currentSlot) {
          throw new BadRequestException("Shift slot is no longer open.");
        }
        const claim = await tx.shiftClaimRequest.create({
          data: {
            organizationId: session.organizationId,
            slotId: slot.id,
            employeeId,
            userId: session.userId,
            status: "PENDING_APPROVAL",
            policyDecision
          }
        });
        const approval = await tx.approvalRequest.create({
          data: {
            organizationId: session.organizationId,
            requestedByUserId: session.userId,
            ...(approverUserId ? { approverUserId } : {}),
            approvalType: "SHIFT_ASSIGNMENT",
            targetObjectType: "ShiftClaimRequest",
            targetObjectId: claim.id,
            claimId: claim.id,
            slotId: slot.id,
            managerScope: {
              type: "UNIT",
              unitIds: [slot.unitId]
            },
            status: "PENDING",
            riskFlags: policyDecision.riskFlags
          }
        });
        const linkedClaim = await tx.shiftClaimRequest.update({
          where: { id: claim.id },
          data: { approvalRequestId: approval.id }
        });
        const updatedSlot = await tx.shiftSlot.update({
          where: { id: slot.id },
          data: {
            status: "CLAIM_PENDING",
            riskFlags: policyDecision.riskFlags
          }
        });
        if (approverUserId) {
          await tx.notification.create({
            data: {
              organizationId: session.organizationId,
              recipientUserId: approverUserId,
              channel: "IN_APP",
              type: "APPROVAL_REQUIRED",
              category: "APPROVAL",
              priority: "HIGH",
              payload: {
                claimId: claim.id,
                approvalId: approval.id,
                slotId: slot.id,
                riskFlags: policyDecision.riskFlags
              }
            }
          });
        }
        await tx.auditLog.create({
          data: {
            organizationId: session.organizationId,
            actorUserId: session.userId,
            actorType: "USER",
            action: "shift_pipeline.claim.pending_approval",
            objectType: "ShiftClaimRequest",
            objectId: claim.id,
            after: {
              approvalId: approval.id,
              slotId: slot.id,
              riskFlags: policyDecision.riskFlags
            }
          }
        });
        return { claim: linkedClaim, approval, slot: updatedSlot };
      },
      { isolationLevel: "Serializable" }
    );
    return {
      status: "PENDING_APPROVAL" as const,
      claim: {
        id: result.claim.id,
        organizationId: result.claim.organizationId,
        slotId: result.claim.slotId,
        employeeId: result.claim.employeeId,
        userId: result.claim.userId,
        status: result.claim.status,
        policyDecision,
        approvalRequestId: result.approval.id,
        createdAt: result.claim.createdAt.toISOString()
      },
      approval: {
        id: result.approval.id,
        approvalType: result.approval.approvalType,
        requestedByUserId: result.approval.requestedByUserId,
        ...(result.approval.approverUserId
          ? { approverUserId: result.approval.approverUserId }
          : {}),
        targetObjectType: result.approval.targetObjectType,
        targetObjectId: result.approval.targetObjectId,
        status: result.approval.status,
        riskFlags: result.approval.riskFlags
      },
      slot: {
        ...slot,
        status: result.slot.status,
        riskFlags: result.slot.riskFlags
      },
      policyDecision
    };
  }

  private async assertSlotInvariant(organizationId: string, slotId: string) {
    const repository = this.repositories.repository();
    const slot = await repository.findSlot({ organizationId, slotId });
    if (!slot) {
      throw new NotFoundException("Shift slot not found while validating claim invariant");
    }
    return assertShiftCoverageInvariants({
      slot,
      assignments: await repository.listAssignments({ organizationId, slotId }),
      claims: await repository.listClaims({ organizationId, slotId })
    });
  }
}
