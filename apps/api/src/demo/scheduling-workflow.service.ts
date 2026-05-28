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
  demoApprovals,
  demoEmployeeByUserId,
  demoNotifications,
  demoSchedules,
  demoSwaps,
  type DemoApprovalRecord,
  type DemoSwapRecord
} from "./demo-data";

@Injectable()
export class SchedulingWorkflowService {
  constructor(@Inject(PermissionService) private readonly permissions: PermissionService) {}

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

    const risk = this.evaluateClaimRisk(session.userId, shiftId);
    if (risk.requiresApproval) {
      const approval = this.createApproval({
        approvalType: "SHIFT_ASSIGNMENT",
        requestedByUserId: session.userId,
        approverUserId: "user_jordan_manager",
        targetObjectType: "Shift",
        targetObjectId: shiftId,
        status: "PENDING",
        riskFlags: risk.riskFlags
      });
      this.queueNotification("user_jordan_manager", "APPROVAL_REQUIRED", { approvalId: approval.id });
      return { status: "PENDING_APPROVAL", shift, approval, risk };
    }

    shift.employeeId = employeeId;
    shift.userId = session.userId;
    shift.status = "ASSIGNED";
    this.queueNotification(session.userId, "SHIFT_ASSIGNED", { shiftId });
    return { status: "ASSIGNED", shift, risk };
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
      riskFlags: ["MANAGER_APPROVAL_REQUIRED"],
      managerApprovalRequired: true,
      timeline: ["Created", "Waiting for counterparty"]
    };
    demoSwaps.push(swap);
    this.queueNotification(proposedUserId, "SWAP_REQUESTED", { swapId: swap.id });
    return swap;
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
    return { swap, approval };
  }

  decideSwap(session: DemoSession, swapId: string, decision: "approve" | "deny", reason?: string) {
    const swap = this.findSwap(swapId);
    this.assertPermission(session, "shift:swap:approve", { type: "UNIT", unitId: swap.unitId });
    if (swap.status !== "PENDING_MANAGER") {
      throw new BadRequestException("Swap is not waiting for manager approval");
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
      return { swap, approval };
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
    return { swap, approval, shift };
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

  private evaluateClaimRisk(userId: string, shiftId: string) {
    if (userId === "user_priya" && shiftId === "shift_open_icu_night") {
      return {
        allowed: true,
        requiresApproval: true,
        riskFlags: ["OVERTIME_RISK"],
        warnings: ["Claiming this may put Priya above 40 hours."]
      };
    }

    return {
      allowed: true,
      requiresApproval: false,
      riskFlags: [],
      warnings: []
    };
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
