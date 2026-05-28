import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import {
  appendDemoAuditLog,
  demoApprovals,
  demoEmployeeByUserId,
  demoNotifications,
  demoSchedules,
  demoSwaps,
  type DemoApprovalRecord,
  type DemoSwapRecord
} from "./demo-data";
import { PolicyEngineService } from "./policy-engine.service";

@Injectable()
export class SchedulingWorkflowService {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(PolicyEngineService) private readonly policy: PolicyEngineService
  ) {}

  claimOpenShift(session: DemoSession, shiftId: string) {
    const shift = demoSchedules.find((candidate) => candidate.id === shiftId);
    if (!shift) {
      throw new NotFoundException("Open shift not found");
    }

    if (shift.status !== "OPEN") {
      throw new BadRequestException("Shift is not open");
    }

    this.assertPermission(session, "shift:claim", { type: "SELF", userId: session.userId });

    const employeeId = demoEmployeeByUserId.get(session.userId);
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
      this.queueNotification("user_jordan_manager", "APPROVAL_REQUIRED", { approvalId: approval.id });
      appendDemoAuditLog({
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
    this.queueNotification(session.userId, "SHIFT_ASSIGNED", { shiftId });
    appendDemoAuditLog({
      actorUserId: session.userId,
      actorType: "USER",
      action: "shift.claim.assigned",
      objectType: "Shift",
      objectId: shiftId,
      after: { assignedEmployeeId: employeeId, policyDecision }
    });
    return { status: "ASSIGNED", shift, policyDecision };
  }

  createSwapRequest(session: DemoSession, originalShiftId: string, proposedUserId = "user_maya") {
    this.assertPermission(session, "shift:swap:create", { type: "SELF", userId: session.userId });

    const originalShift = demoSchedules.find((shift) => shift.id === originalShiftId);
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

    const proposedEmployeeId = demoEmployeeByUserId.get(proposedUserId);
    if (!proposedEmployeeId) {
      throw new BadRequestException("Proposed employee is not available in demo data");
    }

    const swap: DemoSwapRecord = {
      id: `swap_${demoSwaps.length + 1}`,
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
    };
    demoSwaps.push(swap);
    this.queueNotification(proposedUserId, "SWAP_REQUESTED", { swapId: swap.id });
    appendDemoAuditLog({
      actorUserId: session.userId,
      actorType: "USER",
      action: "swap.created",
      objectType: "ShiftSwapRequest",
      objectId: swap.id,
      after: { swap, policyDecision }
    });
    return { ...swap, policyDecision };
  }

  respondToSwap(session: DemoSession, swapId: string, decision: "accept" | "decline") {
    const swap = this.findSwap(swapId);
    if (swap.proposedUserId !== session.userId) {
      throw new ForbiddenException("Only the proposed counterparty can respond to this swap");
    }
    if (swap.status !== "PENDING_COUNTERPARTY") {
      throw new BadRequestException("Swap is not waiting for counterparty response");
    }

    if (decision === "decline") {
      swap.status = "DENIED";
      swap.timeline.push("Counterparty declined");
      this.queueNotification(swap.requesterUserId, "SWAP_DENIED", { swapId });
      appendDemoAuditLog({
        actorUserId: session.userId,
        actorType: "USER",
        action: "swap.counterparty_declined",
        objectType: "ShiftSwapRequest",
        objectId: swapId,
        after: { status: swap.status }
      });
      return swap;
    }

    swap.status = "PENDING_MANAGER";
    swap.timeline.push("Counterparty accepted", "Manager approval pending");
    const approval = this.createApproval({
      approvalType: "SHIFT_SWAP",
      requestedByUserId: swap.requesterUserId,
      approverUserId: "user_jordan_manager",
      targetObjectType: "ShiftSwapRequest",
      targetObjectId: swap.id,
      status: "PENDING",
      riskFlags: swap.riskFlags
    });
    this.queueNotification("user_jordan_manager", "APPROVAL_REQUIRED", { approvalId: approval.id });
    appendDemoAuditLog({
      actorUserId: session.userId,
      actorType: "USER",
      action: "swap.counterparty_accepted",
      objectType: "ShiftSwapRequest",
      objectId: swapId,
      after: { status: swap.status, approvalId: approval.id }
    });
    return { swap, approval };
  }

  decideSwap(session: DemoSession, swapId: string, decision: "approve" | "deny", reason?: string) {
    const swap = this.findSwap(swapId);
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
      swap.status = "DENIED";
      swap.timeline.push("Manager denied");
      approval.status = "DENIED";
      if (reason) {
        approval.decisionReason = reason;
      }
      this.queueNotification(swap.requesterUserId, "SWAP_DENIED", { swapId });
      this.queueNotification(swap.proposedUserId, "SWAP_DENIED", { swapId });
      appendDemoAuditLog({
        actorUserId: session.userId,
        actorType: "USER",
        action: "swap.manager_denied",
        objectType: "ShiftSwapRequest",
        objectId: swapId,
        ...(reason ? { reason } : {}),
        after: { status: swap.status, approvalStatus: approval.status, policyDecision }
      });
      return { swap, approval, policyDecision };
    }

    const shift = demoSchedules.find((candidate) => candidate.id === swap.originalShiftId);
    if (!shift) {
      throw new NotFoundException("Original shift not found");
    }
    shift.employeeId = swap.proposedEmployeeId;
    shift.userId = swap.proposedUserId;
    swap.status = "APPROVED";
    swap.timeline.push("Manager approved", "Schedule updated");
    approval.status = "APPROVED";
    if (reason) {
      approval.decisionReason = reason;
    }
    this.queueNotification(swap.requesterUserId, "SWAP_APPROVED", { swapId });
    this.queueNotification(swap.proposedUserId, "SWAP_APPROVED", { swapId });
    appendDemoAuditLog({
      actorUserId: session.userId,
      actorType: "USER",
      action: "swap.manager_approved",
      objectType: "ShiftSwapRequest",
      objectId: swapId,
      ...(reason ? { reason } : {}),
      after: { status: swap.status, approvalStatus: approval.status, shift, policyDecision }
    });
    return { swap, approval, shift, policyDecision };
  }

  listSwaps(session: DemoSession) {
    if (session.role === "UNIT_MANAGER") {
      return demoSwaps.filter((swap) =>
        this.permissions.hasPermission(session, "shift:swap:approve", {
          type: "UNIT",
          unitId: swap.unitId
        })
      );
    }

    return demoSwaps.filter(
      (swap) => swap.requesterUserId === session.userId || swap.proposedUserId === session.userId
    );
  }

  private createApproval(input: Omit<DemoApprovalRecord, "id">) {
    const approval: DemoApprovalRecord = {
      id: `approval_${demoApprovals.length + 1}`,
      ...input
    };
    demoApprovals.push(approval);
    return approval;
  }

  private findSwap(swapId: string) {
    const swap = demoSwaps.find((candidate) => candidate.id === swapId);
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

  private queueNotification(recipientUserId: string, type: string, payload: Record<string, string>) {
    demoNotifications.push({
      id: `notification_${demoNotifications.length + 1}`,
      recipientUserId,
      type,
      status: "QUEUED",
      payload
    });
  }
}
