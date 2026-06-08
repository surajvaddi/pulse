import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { assertShiftCoverageInvariants } from "@pulseshift/domain";

import { demoApprovals, demoEmployeeByUserId } from "../demo/demo-data";
import { demoSessions, type DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { ShiftEligibilityService } from "./shift-eligibility.service";
import { recordShiftPipelineEvent } from "./shift-pipeline-events";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";

@Injectable()
export class ShiftManagerService {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(ShiftEligibilityService) private readonly eligibility: ShiftEligibilityService,
    @Inject(ShiftPipelineRepositoryProvider) private readonly repositories: ShiftPipelineRepositoryProvider
  ) {}

  async decidePendingClaim(session: DemoSession, claimId: string, decision: "approve" | "deny", reason?: string) {
    const repository = this.repositories.repository();
    const [claim] = await repository
      .listClaims({ organizationId: session.organizationId, statuses: ["PENDING_APPROVAL"] })
      .then((claims) => claims.filter((candidate) => candidate.id === claimId));
    if (!claim) {
      throw new NotFoundException("Pending claim not found");
    }

    const slot = await repository.findSlot({ organizationId: session.organizationId, slotId: claim.slotId });
    if (!slot) {
      throw new NotFoundException("Claimed shift slot not found");
    }
    this.assertCanAssign(session, slot.unitId);

    const approval = demoApprovals.find((candidate) => candidate.id === claim.approvalRequestId);
    if (!approval) {
      throw new NotFoundException("Claim approval request not found");
    }

    if (decision === "deny") {
      approval.status = "DENIED";
      approval.approverUserId = session.userId;
      if (reason) {
        approval.decisionReason = reason;
      }
      const deniedClaim = await repository.updateClaim({
        organizationId: session.organizationId,
        claimId,
        status: "DENIED",
        decidedAt: new Date().toISOString()
      });
      await repository.updateSlotStatus({
        organizationId: session.organizationId,
        slotId: slot.id,
        status: "OPEN",
        riskFlags: slot.riskFlags
      });
      await this.assertSlotInvariant(session.organizationId, slot.id);
      recordShiftPipelineEvent({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        action: "shift_pipeline.claim.denied",
        objectType: "ShiftClaimRequest",
        objectId: deniedClaim.id,
        ...(reason ? { reason } : {}),
        after: { slotId: slot.id, approvalId: approval.id },
        notifyUserId: claim.userId,
        notificationType: "SHIFT_CLAIM_DENIED"
      });
      return { status: "DENIED" as const, claim: deniedClaim, approval };
    }

    const activeAssignment = await repository.findActiveAssignmentForSlot({
      organizationId: session.organizationId,
      slotId: slot.id
    });
    if (activeAssignment) {
      throw new BadRequestException("Shift slot already has an active assignment.");
    }

    const assignment = await repository.createAssignment({
      organizationId: session.organizationId,
      slotId: slot.id,
      employeeId: claim.employeeId,
      assignedByUserId: session.userId,
      status: "ACTIVE",
      source: "CLAIM"
    });
    const assignedClaim = await repository.updateClaim({
      organizationId: session.organizationId,
      claimId,
      status: "ASSIGNED",
      assignmentId: assignment.id,
      decidedAt: new Date().toISOString()
    });
    const assignedSlot = await repository.updateSlotStatus({
      organizationId: session.organizationId,
      slotId: slot.id,
      status: "ASSIGNED",
      riskFlags: claim.policyDecision.riskFlags
    });
    approval.status = "APPROVED";
    approval.approverUserId = session.userId;
    if (reason) {
      approval.decisionReason = reason;
    }
    await this.assertSlotInvariant(session.organizationId, slot.id);
    recordShiftPipelineEvent({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "shift_pipeline.claim.approved",
      objectType: "ShiftClaimRequest",
      objectId: assignedClaim.id,
      ...(reason ? { reason } : {}),
      after: { slotId: slot.id, assignmentId: assignment.id, approvalId: approval.id },
      notifyUserId: claim.userId,
      notificationType: "SHIFT_CLAIM_APPROVED"
    });
    return { status: "ASSIGNED" as const, slot: assignedSlot, claim: assignedClaim, assignment, approval };
  }

  async directAssignSlot(
    session: DemoSession,
    slotId: string,
    assigneeUserId: string,
    options: { overrideReason?: string } = {}
  ) {
    const repository = this.repositories.repository();
    const slot = await repository.findSlot({ organizationId: session.organizationId, slotId });
    if (!slot) {
      throw new NotFoundException("Shift slot not found");
    }
    this.assertCanAssign(session, slot.unitId);

    const activeAssignment = await repository.findActiveAssignmentForSlot({
      organizationId: session.organizationId,
      slotId
    });
    if (activeAssignment) {
      throw new BadRequestException("Shift slot already has an active assignment.");
    }

    const assigneeSession = demoSessions.find((candidate) => candidate.userId === assigneeUserId);
    const employeeId = demoEmployeeByUserId.get(assigneeUserId);
    if (!assigneeSession || !employeeId) {
      throw new BadRequestException("Assignee does not have a claimable employee profile.");
    }

    const policyDecision = this.eligibility.evaluateClaim({
      session: assigneeSession,
      slot,
      employeeId
    });
    if (!policyDecision.allowed) {
      if (!options.overrideReason) {
        throw new BadRequestException({
          message: "Direct assignment blocked by policy",
          policyDecision
        });
      }
      if (!this.permissions.hasPermission(session, "shift:assign:override", { type: "UNIT", unitId: slot.unitId })) {
        throw new ForbiddenException("Direct assignment override requires shift override permission.");
      }
    }

    const assignment = await repository.createAssignment({
      organizationId: session.organizationId,
      slotId,
      employeeId,
      assignedByUserId: session.userId,
      status: "ACTIVE",
      source: "MANAGER_ASSIGNMENT"
    });
    const assignedSlot = await repository.updateSlotStatus({
      organizationId: session.organizationId,
      slotId,
      status: "ASSIGNED",
      riskFlags: policyDecision.riskFlags
    });
    await this.assertSlotInvariant(session.organizationId, slotId);
    recordShiftPipelineEvent({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "shift_pipeline.slot.direct_assigned",
      objectType: "ShiftAssignment",
      objectId: assignment.id,
      ...(options.overrideReason ? { reason: options.overrideReason } : {}),
      after: { slotId, assigneeUserId, policyDecision },
      notifyUserId: assigneeUserId,
      notificationType: "SHIFT_DIRECT_ASSIGNED"
    });
    return { status: "ASSIGNED" as const, slot: assignedSlot, assignment, policyDecision };
  }

  private assertCanAssign(session: DemoSession, unitId: string) {
    if (!this.permissions.hasPermission(session, "shift:assign", { type: "UNIT", unitId })) {
      throw new ForbiddenException("User is not allowed to assign shifts for this unit.");
    }
  }

  private async assertSlotInvariant(organizationId: string, slotId: string) {
    const repository = this.repositories.repository();
    const slot = await repository.findSlot({ organizationId, slotId });
    if (!slot) {
      throw new NotFoundException("Shift slot not found while validating manager invariant");
    }
    return assertShiftCoverageInvariants({
      slot,
      assignments: await repository.listAssignments({ organizationId, slotId }),
      claims: await repository.listClaims({ organizationId, slotId })
    });
  }
}
