import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
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

    const employeeId = this.employeeIdForSession(session);
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

  private employeeIdForSession(session: DemoSession) {
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
