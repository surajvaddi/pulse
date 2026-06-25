import { Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";
import {
  ShiftPolicyDecisionSnapshotSchema,
  type ShiftSwapRequestContract
} from "@pulseshift/domain";

export const demoShiftSwapRequests: ShiftSwapRequestContract[] = [];

export interface ShiftSwapRepository {
  list(input: {
    organizationId: string;
    status?: ShiftSwapRequestContract["status"];
    userId?: string;
  }): Promise<ShiftSwapRequestContract[]>;
  find(input: {
    organizationId: string;
    swapId: string;
  }): Promise<ShiftSwapRequestContract | null>;
  create(
    input: Omit<ShiftSwapRequestContract, "id">
  ): Promise<ShiftSwapRequestContract>;
  update(
    input: Pick<ShiftSwapRequestContract, "organizationId" | "id"> &
      Partial<
        Pick<
          ShiftSwapRequestContract,
          | "status"
          | "approvalRequestId"
          | "assignmentId"
          | "decidedAt"
          | "expiresAt"
        >
      >
  ): Promise<ShiftSwapRequestContract>;
}

@Injectable()
export class InMemoryShiftSwapRepository implements ShiftSwapRepository {
  async list(input: {
    organizationId: string;
    status?: ShiftSwapRequestContract["status"];
    userId?: string;
  }) {
    return demoShiftSwapRequests.filter(
      (swap) =>
        swap.organizationId === input.organizationId &&
        (!input.status || swap.status === input.status) &&
        (!input.userId ||
          swap.requesterUserId === input.userId ||
          swap.proposedUserId === input.userId)
    );
  }

  async find(input: { organizationId: string; swapId: string }) {
    return (
      demoShiftSwapRequests.find(
        (swap) =>
          swap.organizationId === input.organizationId &&
          swap.id === input.swapId
      ) ?? null
    );
  }

  async create(input: Omit<ShiftSwapRequestContract, "id">) {
    const swap = {
      id: `swap_${demoShiftSwapRequests.length + 1}`,
      ...input
    };
    demoShiftSwapRequests.push(swap);
    return swap;
  }

  async update(
    input: Pick<ShiftSwapRequestContract, "organizationId" | "id"> &
      Partial<ShiftSwapRequestContract>
  ) {
    const swap = await this.find({
      organizationId: input.organizationId,
      swapId: input.id
    });
    if (!swap) throw new Error("Shift swap request not found.");
    Object.assign(swap, input);
    return swap;
  }
}

function mapSwap(row: {
  id: string;
  organizationId: string;
  originalSlotId: string | null;
  requesterEmployeeId: string;
  requesterUserId: string;
  proposedEmployeeId: string | null;
  proposedUserId: string;
  unitId: string;
  status: string;
  policyDecision: unknown;
  managerApprovalRequired: boolean;
  approvalRequestId: string | null;
  assignmentId: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  expiresAt: Date | null;
}): ShiftSwapRequestContract {
  return {
    id: row.id,
    organizationId: row.organizationId,
    originalSlotId: row.originalSlotId ?? "",
    requesterEmployeeId: row.requesterEmployeeId,
    requesterUserId: row.requesterUserId,
    proposedEmployeeId: row.proposedEmployeeId ?? "",
    proposedUserId: row.proposedUserId,
    unitId: row.unitId,
    status: row.status as ShiftSwapRequestContract["status"],
    policyDecision: ShiftPolicyDecisionSnapshotSchema.parse(row.policyDecision),
    managerApprovalRequired: row.managerApprovalRequired,
    ...(row.approvalRequestId
      ? { approvalRequestId: row.approvalRequestId }
      : {}),
    ...(row.assignmentId ? { assignmentId: row.assignmentId } : {}),
    createdAt: row.createdAt.toISOString(),
    ...(row.decidedAt ? { decidedAt: row.decidedAt.toISOString() } : {}),
    ...(row.expiresAt ? { expiresAt: row.expiresAt.toISOString() } : {})
  };
}

@Injectable()
export class PrismaShiftSwapRepository implements ShiftSwapRepository {
  async list(input: {
    organizationId: string;
    status?: ShiftSwapRequestContract["status"];
    userId?: string;
  }) {
    const rows = await prisma.shiftSwapRequest.findMany({
      where: {
        organizationId: input.organizationId,
        ...(input.status
          ? {
              status:
                input.status === "PREVIEW" ? ("PREVIEW" as const) : input.status
            }
          : {}),
        ...(input.userId
          ? {
              OR: [
                { requesterUserId: input.userId },
                { proposedUserId: input.userId }
              ]
            }
          : {})
      },
      orderBy: { createdAt: "desc" }
    });
    return rows.map(mapSwap);
  }

  async find(input: { organizationId: string; swapId: string }) {
    const row = await prisma.shiftSwapRequest.findFirst({
      where: { organizationId: input.organizationId, id: input.swapId }
    });
    return row ? mapSwap(row) : null;
  }

  async create(input: Omit<ShiftSwapRequestContract, "id">) {
    const row = await prisma.shiftSwapRequest.create({
      data: {
        organizationId: input.organizationId,
        originalSlotId: input.originalSlotId,
        requesterEmployeeId: input.requesterEmployeeId,
        requesterUserId: input.requesterUserId,
        proposedEmployeeId: input.proposedEmployeeId,
        proposedUserId: input.proposedUserId,
        unitId: input.unitId,
        status: input.status,
        riskFlags: input.policyDecision.riskFlags,
        policyDecision: input.policyDecision,
        createdBy: input.requesterUserId,
        managerApprovalRequired: input.managerApprovalRequired,
        ...(input.approvalRequestId
          ? { approvalRequestId: input.approvalRequestId }
          : {}),
        ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
        ...(input.decidedAt
          ? { decidedAt: new Date(input.decidedAt) }
          : {}),
        ...(input.expiresAt
          ? { expiresAt: new Date(input.expiresAt) }
          : {})
      }
    });
    return mapSwap(row);
  }

  async update(
    input: Pick<ShiftSwapRequestContract, "organizationId" | "id"> &
      Partial<ShiftSwapRequestContract>
  ) {
    const row = await prisma.shiftSwapRequest.update({
      where: { id: input.id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.approvalRequestId
          ? { approvalRequestId: input.approvalRequestId }
          : {}),
        ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
        ...(input.decidedAt
          ? { decidedAt: new Date(input.decidedAt) }
          : {}),
        ...(input.expiresAt
          ? { expiresAt: new Date(input.expiresAt) }
          : {})
      }
    });
    return mapSwap(row);
  }
}

@Injectable()
export class ShiftSwapRepositoryProvider {
  private readonly memory = new InMemoryShiftSwapRepository();
  private readonly persistent = new PrismaShiftSwapRepository();

  repository() {
    return process.env.WORKFLOW_PERSISTENCE === "prisma"
      ? this.persistent
      : this.memory;
  }
}
