import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { demoApprovals, type DemoApprovalRecord } from "./demo-data";
import { AuditService } from "./audit.service";
import { NotificationEventPublisher } from "./notification-event.publisher";
import { PolicyEngineService } from "./policy-engine.service";
import { ScheduleRepositoryProvider } from "./schedule.repository";
import { SwapRepositoryProvider } from "./swap.repository";

@Injectable()
export class SchedulingWorkflowService {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(PolicyEngineService) private readonly policy: PolicyEngineService,
    @Inject(ScheduleRepositoryProvider) private readonly schedules: ScheduleRepositoryProvider,
    @Inject(SwapRepositoryProvider) private readonly swaps: SwapRepositoryProvider,
    @Inject(NotificationEventPublisher) private readonly notifications: NotificationEventPublisher,
    @Inject(AuditService) private readonly auditLogs: AuditService
  ) {}

  async listOpenShifts(session: DemoSession) {
    this.assertPermission(session, "shift:claim", { type: "SELF", userId: session.userId });
    return this.schedules.repository().findOpenShifts({
      organizationId: session.organizationId
    });
  }

  async claimOpenShift(session: DemoSession, shiftId: string) {
    const shift = await this.schedules.repository().findShift({
      organizationId: session.organizationId,
      shiftId
    });
    if (!shift) {
      throw new NotFoundException("Open shift not found");
    }

    if (shift.status !== "OPEN") {
      throw new BadRequestException("Shift is not open");
    }

    this.assertPermission(session, "shift:claim", { type: "SELF", userId: session.userId });

    const employeeId = await this.schedules.repository().employeeIdForUser(session.userId);
    if (!employeeId) {
      throw new BadRequestException("Demo user does not have an employee profile");
    }

    const policyDecision = this.policy.evaluateOpenShiftClaim(session, shift);
    if (!policyDecision.allowed) {
      throw new BadRequestException({
        message: "Open shift claim blocked by policy",
        policyDecision
      });
    }

    if (policyDecision.requiresApproval) {
      const approval = this.createApproval({
        approvalType: "SHIFT_ASSIGNMENT",
        requestedByUserId: session.userId,
        approverUserId: "user_jordan_manager",
        targetObjectType: "Shift",
        targetObjectId: shiftId,
        status: "PENDING",
        riskFlags: policyDecision.riskFlags
      });
      await this.notifications.publish({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        recipientUserId: "user_jordan_manager",
        event: "APPROVAL_REQUIRED",
        payload: { approvalId: approval.id }
      });
      await this.auditLogs.append({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorType: "USER",
        action: "shift.claim.approval_requested",
        objectType: "Shift",
        objectId: shiftId,
        after: { approvalId: approval.id, policyDecision }
      });
      return { status: "PENDING_APPROVAL", shift, approval, policyDecision };
    }

    shift.employeeId = employeeId;
    shift.userId = session.userId;
    shift.status = "ASSIGNED";
    await this.notifications.publish({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      recipientUserId: session.userId,
      event: "SHIFT_ASSIGNED",
      payload: { shiftId }
    });
    await this.auditLogs.append({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorType: "USER",
      action: "shift.claim.assigned",
      objectType: "Shift",
      objectId: shiftId,
      after: { assignedEmployeeId: employeeId, policyDecision }
    });
    return { status: "ASSIGNED", shift, policyDecision };
  }

  async createSwapRequest(session: DemoSession, originalShiftId: string, proposedUserId = "user_maya") {
    this.assertPermission(session, "shift:swap:create", { type: "SELF", userId: session.userId });

    const originalShift = await this.schedules.repository().findShift({
      organizationId: session.organizationId,
      shiftId: originalShiftId
    });
    if (!originalShift) {
      throw new NotFoundException("Original shift not found");
    }
    if (originalShift.userId !== session.userId) {
      throw new ForbiddenException("Cannot swap a shift outside your self scope");
    }

    const policyDecision = this.policy.evaluateSwapCreation(session, originalShift);
    if (!policyDecision.allowed) {
      throw new BadRequestException({
        message: "Swap request blocked by policy",
        policyDecision
      });
    }

    const proposedEmployeeId = await this.schedules.repository().employeeIdForUser(proposedUserId);
    if (!proposedEmployeeId) {
      throw new BadRequestException("Proposed employee is not available in demo data");
    }

    const swap = await this.swaps.repository().createSwap({
      requesterEmployeeId: originalShift.employeeId ?? "",
      requesterUserId: session.userId,
      originalShiftId,
      proposedEmployeeId,
      proposedUserId,
      unitId: originalShift.unitId,
      status: "PENDING_COUNTERPARTY",
      riskFlags: policyDecision.riskFlags,
      managerApprovalRequired: policyDecision.requiresApproval,
      timeline: ["Created", "Waiting for counterparty"]
    });
    await this.notifications.publish({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      recipientUserId: proposedUserId,
      event: "SWAP_REQUESTED",
      payload: { swapId: swap.id }
    });
    await this.auditLogs.append({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorType: "USER",
      action: "swap.created",
      objectType: "ShiftSwapRequest",
      objectId: swap.id,
      after: { swap, policyDecision }
    });
    return { ...swap, policyDecision };
  }

  async respondToSwap(session: DemoSession, swapId: string, decision: "accept" | "decline") {
    const swap = await this.findSwap(session.organizationId, swapId);
    if (swap.proposedUserId !== session.userId) {
      throw new ForbiddenException("Only the proposed counterparty can respond to this swap");
    }
    if (swap.status !== "PENDING_COUNTERPARTY") {
      throw new BadRequestException("Swap is not waiting for counterparty response");
    }

    if (decision === "decline") {
      const declinedSwap = await this.swaps.repository().declineSwap({
        organizationId: session.organizationId,
        swapId
      });
      await this.notifications.publish({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        recipientUserId: swap.requesterUserId,
        event: "SWAP_DENIED",
        payload: { swapId }
      });
      await this.auditLogs.append({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorType: "USER",
        action: "swap.counterparty_declined",
        objectType: "ShiftSwapRequest",
        objectId: swapId,
        after: { status: declinedSwap.status }
      });
      return declinedSwap;
    }

    const acceptedSwap = await this.swaps.repository().acceptSwap({
      organizationId: session.organizationId,
      swapId
    });
    const approval = this.createApproval({
      approvalType: "SHIFT_SWAP",
      requestedByUserId: acceptedSwap.requesterUserId,
      approverUserId: "user_jordan_manager",
      targetObjectType: "ShiftSwapRequest",
      targetObjectId: acceptedSwap.id,
      status: "PENDING",
      riskFlags: acceptedSwap.riskFlags
    });
    await this.notifications.publish({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      recipientUserId: "user_jordan_manager",
      event: "APPROVAL_REQUIRED",
      payload: { approvalId: approval.id }
    });
    await this.auditLogs.append({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorType: "USER",
      action: "swap.counterparty_accepted",
      objectType: "ShiftSwapRequest",
      objectId: swapId,
      after: { status: acceptedSwap.status, approvalId: approval.id }
    });
    return { swap: acceptedSwap, approval };
  }

  async decideSwap(session: DemoSession, swapId: string, decision: "approve" | "deny", reason?: string) {
    const swap = await this.findSwap(session.organizationId, swapId);
    this.assertPermission(session, "shift:swap:approve", { type: "UNIT", unitId: swap.unitId });
    if (swap.status !== "PENDING_MANAGER") {
      throw new BadRequestException("Swap is not waiting for manager approval");
    }

    const policyDecision = this.policy.evaluateSwapApproval(swap);
    if (!policyDecision.allowed) {
      throw new BadRequestException({
        message: "Swap approval blocked by policy",
        policyDecision
      });
    }

    const approval = demoApprovals.find((candidate) => candidate.targetObjectId === swapId);
    if (!approval) {
      throw new NotFoundException("Approval request not found");
    }

    if (decision === "deny") {
      const deniedSwap = await this.swaps.repository().denySwap({
        organizationId: session.organizationId,
        swapId
      });
      approval.status = "DENIED";
      if (reason) {
        approval.decisionReason = reason;
      }
      await this.notifications.publish({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        recipientUserId: swap.requesterUserId,
        event: "SWAP_DENIED",
        payload: { swapId }
      });
      await this.notifications.publish({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        recipientUserId: swap.proposedUserId,
        event: "SWAP_DENIED",
        payload: { swapId }
      });
      await this.auditLogs.append({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorType: "USER",
        action: "swap.manager_denied",
        objectType: "ShiftSwapRequest",
        objectId: swapId,
        ...(reason ? { reason } : {}),
        after: { status: deniedSwap.status, approvalStatus: approval.status, policyDecision }
      });
      return { swap: deniedSwap, approval, policyDecision };
    }

    const shift = await this.schedules.repository().findShift({
      organizationId: session.organizationId,
      shiftId: swap.originalShiftId
    });
    if (!shift) {
      throw new NotFoundException("Original shift not found");
    }
    const transaction = await this.swaps.repository().approveSwapAndAssignShift({
      organizationId: session.organizationId,
      swapId,
      shiftId: shift.id,
      employeeId: swap.proposedEmployeeId,
      userId: swap.proposedUserId,
      status: shift.status === "PUBLISHED" ? "PUBLISHED" : "ASSIGNED",
      approvalId: approval.id,
      ...(reason ? { decisionReason: reason } : {}),
      injectFailureAfterSwapUpdate: process.env.PULSESHIFT_INJECT_SWAP_APPROVAL_FAILURE === "after_swap_update"
    });
    approval.status = "APPROVED";
    if (reason) {
      approval.decisionReason = reason;
    }
    await this.notifications.publish({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      recipientUserId: swap.requesterUserId,
      event: "SWAP_APPROVED",
      payload: { swapId }
    });
    await this.notifications.publish({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      recipientUserId: swap.proposedUserId,
      event: "SWAP_APPROVED",
      payload: { swapId }
    });
    await this.auditLogs.append({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorType: "USER",
      action: "swap.manager_approved",
      objectType: "ShiftSwapRequest",
      objectId: swapId,
      ...(reason ? { reason } : {}),
      after: {
        status: transaction.swap.status,
        approvalStatus: approval.status,
        shift: transaction.shift,
        policyDecision
      }
    });
    return { swap: transaction.swap, approval, shift: transaction.shift, policyDecision };
  }

  async listSwaps(session: DemoSession) {
    if (session.role === "UNIT_MANAGER") {
      const swaps = await this.swaps.repository().listSwaps({
        organizationId: session.organizationId
      });
      return swaps.filter((swap) =>
        this.permissions.hasPermission(session, "shift:swap:approve", {
          type: "UNIT",
          unitId: swap.unitId
        })
      );
    }

    return this.swaps.repository().listSwaps({
      organizationId: session.organizationId,
      requesterUserId: session.userId,
      proposedUserId: session.userId
    });
  }

  private createApproval(input: Omit<DemoApprovalRecord, "id">) {
    const approval: DemoApprovalRecord = {
      id: `approval_${demoApprovals.length + 1}`,
      ...input
    };
    demoApprovals.push(approval);
    return approval;
  }

  private async findSwap(organizationId: string, swapId: string) {
    const swap = await this.swaps.repository().findSwap(organizationId, swapId);
    if (!swap) {
      throw new NotFoundException("Swap request not found");
    }
    return swap;
  }

  private assertPermission(
    session: DemoSession,
    permission: Parameters<PermissionService["hasPermission"]>[1],
    scope: Parameters<PermissionService["hasPermission"]>[2]
  ) {
    if (!this.permissions.hasPermission(session, permission, scope)) {
      throw new ForbiddenException({
        message: "Forbidden by PulseShift scoped permissions",
        userId: session.userId,
        role: session.role
      });
    }
  }

}
