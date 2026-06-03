import { Inject, Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";

import { demoSwaps, type DemoSwapRecord } from "./demo-data";
import type { SwapRepository } from "../workflows/repository-contracts";

type SwapQuery = Parameters<SwapRepository["listSwaps"]>[0];
type SwapMutationInput = { organizationId: string; swapId: string };
type PrismaSwapStatus =
  | "DRAFT"
  | "PENDING_COUNTERPARTY"
  | "PENDING_MANAGER"
  | "APPROVED"
  | "DENIED"
  | "CANCELLED"
  | "EXPIRED";

type PrismaSwapRecord = {
  id: string;
  requesterEmployeeId: string;
  requesterEmployee: { userId: string | null };
  originalShiftId: string;
  proposedEmployeeId: string | null;
  proposedEmployee: { userId: string | null } | null;
  unitId: string;
  status: PrismaSwapStatus;
  riskFlags: string[];
  createdBy: string;
  managerApprovalRequired: boolean;
};

const swapIncludes = {
  requesterEmployee: { select: { userId: true } },
  proposedEmployee: { select: { userId: true } }
} as const;

function persistenceEnabled() {
  return process.env.WORKFLOW_PERSISTENCE === "prisma";
}

function mapSwapStatus(status: PrismaSwapStatus): DemoSwapRecord["status"] {
  if (status === "DRAFT") {
    return "PENDING_COUNTERPARTY";
  }
  if (status === "EXPIRED") {
    return "CANCELLED";
  }
  return status;
}

function timelineForStatus(status: DemoSwapRecord["status"]) {
  if (status === "PENDING_COUNTERPARTY") {
    return ["Created", "Waiting for counterparty"];
  }
  if (status === "PENDING_MANAGER") {
    return ["Counterparty accepted", "Manager approval pending"];
  }
  if (status === "APPROVED") {
    return ["Manager approved", "Schedule updated"];
  }
  if (status === "DENIED") {
    return ["Denied"];
  }
  return ["Cancelled"];
}

function mapPrismaSwap(swap: PrismaSwapRecord): DemoSwapRecord {
  const status = mapSwapStatus(swap.status);
  return {
    id: swap.id,
    requesterEmployeeId: swap.requesterEmployeeId,
    requesterUserId: swap.requesterEmployee.userId ?? swap.createdBy,
    originalShiftId: swap.originalShiftId,
    proposedEmployeeId: swap.proposedEmployeeId ?? "",
    proposedUserId: swap.proposedEmployee?.userId ?? "",
    unitId: swap.unitId,
    status,
    riskFlags: swap.riskFlags,
    managerApprovalRequired: swap.managerApprovalRequired,
    timeline: timelineForStatus(status)
  };
}

function matchesSwapQuery(swap: DemoSwapRecord, query: SwapQuery) {
  if (query.unitId && swap.unitId !== query.unitId) {
    return false;
  }
  if (query.statuses && !query.statuses.includes(swap.status)) {
    return false;
  }
  if (query.requesterUserId && query.proposedUserId) {
    return swap.requesterUserId === query.requesterUserId || swap.proposedUserId === query.proposedUserId;
  }
  if (query.requesterUserId && swap.requesterUserId !== query.requesterUserId) {
    return false;
  }
  if (query.proposedUserId && swap.proposedUserId !== query.proposedUserId) {
    return false;
  }
  return true;
}

@Injectable()
export class InMemorySwapRepository implements SwapRepository {
  async listSwaps(query: SwapQuery) {
    return demoSwaps.filter((swap) => matchesSwapQuery(swap, query));
  }

  async findSwap(_organizationId: string, swapId: string) {
    return demoSwaps.find((swap) => swap.id === swapId) ?? null;
  }

  async createSwap(input: Omit<DemoSwapRecord, "id">) {
    const swap: DemoSwapRecord = {
      id: `swap_${demoSwaps.length + 1}`,
      ...input
    };
    demoSwaps.push(swap);
    return swap;
  }

  async acceptSwap(input: SwapMutationInput) {
    return this.updateSwap(input.swapId, "PENDING_MANAGER", ["Counterparty accepted", "Manager approval pending"]);
  }

  async declineSwap(input: SwapMutationInput) {
    return this.updateSwap(input.swapId, "DENIED", ["Counterparty declined"]);
  }

  async approveSwap(input: SwapMutationInput) {
    return this.updateSwap(input.swapId, "APPROVED", ["Manager approved", "Schedule updated"]);
  }

  async denySwap(input: SwapMutationInput) {
    return this.updateSwap(input.swapId, "DENIED", ["Manager denied"]);
  }

  private updateSwap(swapId: string, status: DemoSwapRecord["status"], timelineEntries: string[]) {
    const swap = demoSwaps.find((candidate) => candidate.id === swapId);
    if (!swap) {
      throw new Error(`Swap request not found: ${swapId}`);
    }
    swap.status = status;
    swap.timeline.push(...timelineEntries);
    return swap;
  }
}

@Injectable()
export class PrismaSwapRepository implements SwapRepository {
  async listSwaps(query: SwapQuery) {
    const swaps = await prisma.shiftSwapRequest.findMany({
      where: {
        originalShift: { organizationId: query.organizationId },
        ...(query.unitId ? { unitId: query.unitId } : {}),
        ...(query.statuses ? { status: { in: query.statuses } } : {}),
        ...(query.requesterUserId || query.proposedUserId
          ? {
              OR: [
                ...(query.requesterUserId ? [{ requesterEmployee: { userId: query.requesterUserId } }] : []),
                ...(query.proposedUserId ? [{ proposedEmployee: { userId: query.proposedUserId } }] : [])
              ]
            }
          : {})
      },
      include: swapIncludes,
      orderBy: { createdAt: "desc" }
    });
    return swaps.map(mapPrismaSwap);
  }

  async findSwap(organizationId: string, swapId: string) {
    const swap = await prisma.shiftSwapRequest.findFirst({
      where: {
        id: swapId,
        originalShift: { organizationId }
      },
      include: swapIncludes
    });
    return swap ? mapPrismaSwap(swap) : null;
  }

  async createSwap(input: Omit<DemoSwapRecord, "id">) {
    const data = {
      requesterEmployeeId: input.requesterEmployeeId,
      originalShiftId: input.originalShiftId,
      proposedEmployeeId: input.proposedEmployeeId,
      unitId: input.unitId,
      status: input.status,
      riskFlags: input.riskFlags,
      createdBy: input.requesterUserId,
      managerApprovalRequired: input.managerApprovalRequired
    };
    const swap = await prisma.shiftSwapRequest.create({
      data,
      include: swapIncludes
    });
    return mapPrismaSwap(swap);
  }

  async acceptSwap(input: SwapMutationInput) {
    return this.updateSwap(input, "PENDING_MANAGER");
  }

  async declineSwap(input: SwapMutationInput) {
    return this.updateSwap(input, "DENIED");
  }

  async approveSwap(input: SwapMutationInput) {
    return this.updateSwap(input, "APPROVED");
  }

  async denySwap(input: SwapMutationInput) {
    return this.updateSwap(input, "DENIED");
  }

  private async updateSwap(input: SwapMutationInput, status: DemoSwapRecord["status"]) {
    await prisma.shiftSwapRequest.updateMany({
      where: {
        id: input.swapId,
        originalShift: { organizationId: input.organizationId }
      },
      data: { status }
    });
    const swap = await this.findSwap(input.organizationId, input.swapId);
    if (!swap) {
      throw new Error(`Swap request not found: ${input.swapId}`);
    }
    return swap;
  }
}

@Injectable()
export class SwapRepositoryProvider {
  constructor(
    @Inject(InMemorySwapRepository) private readonly memory: InMemorySwapRepository,
    @Inject(PrismaSwapRepository) private readonly persistent: PrismaSwapRepository
  ) {}

  repository() {
    return persistenceEnabled() ? this.persistent : this.memory;
  }
}
