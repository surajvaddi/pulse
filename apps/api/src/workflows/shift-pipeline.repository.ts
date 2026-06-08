import { Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";
import type {
  ShiftAssignmentContract,
  ShiftAssignmentStatus,
  ShiftClaimRequestContract,
  ShiftClaimStatus,
  ShiftSlotContract,
  ShiftSlotStatus
} from "@pulseshift/domain";

export const demoShiftSlots: ShiftSlotContract[] = [];
export const demoShiftAssignments: ShiftAssignmentContract[] = [];
export const demoShiftClaims: ShiftClaimRequestContract[] = [];

export type ShiftSlotQuery = {
  organizationId: string;
  slotId?: string;
  unitId?: string;
  facilityId?: string;
  statuses?: ShiftSlotStatus[];
};

export type ShiftClaimQuery = {
  organizationId: string;
  slotId?: string;
  employeeId?: string;
  statuses?: ShiftClaimStatus[];
};

export type ShiftAssignmentQuery = {
  organizationId: string;
  slotId?: string;
  employeeId?: string;
  statuses?: ShiftAssignmentStatus[];
};

export interface ShiftPipelineRepository {
  listSlots(query: ShiftSlotQuery): Promise<ShiftSlotContract[]>;
  findSlot(query: { organizationId: string; slotId: string }): Promise<ShiftSlotContract | null>;
  createSlot(input: Omit<ShiftSlotContract, "id"> & { id?: string }): Promise<ShiftSlotContract>;
  updateSlotStatus(input: {
    organizationId: string;
    slotId: string;
    status: ShiftSlotStatus;
    riskFlags?: string[];
  }): Promise<ShiftSlotContract>;
  listClaims(query: ShiftClaimQuery): Promise<ShiftClaimRequestContract[]>;
  createClaim(input: Omit<ShiftClaimRequestContract, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<ShiftClaimRequestContract>;
  updateClaim(input: {
    organizationId: string;
    claimId: string;
    status: ShiftClaimStatus;
    approvalRequestId?: string;
    assignmentId?: string;
    decidedAt?: string;
  }): Promise<ShiftClaimRequestContract>;
  listAssignments(query: ShiftAssignmentQuery): Promise<ShiftAssignmentContract[]>;
  findActiveAssignmentForSlot(query: { organizationId: string; slotId: string }): Promise<ShiftAssignmentContract | null>;
  createAssignment(input: Omit<ShiftAssignmentContract, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<ShiftAssignmentContract>;
  updateAssignment(input: {
    organizationId: string;
    assignmentId: string;
    status: ShiftAssignmentStatus;
    endedAt?: string;
  }): Promise<ShiftAssignmentContract>;
}

type PrismaModelFacade = {
  findMany(args: unknown): Promise<unknown>;
  findFirst(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
};

function nowIso() {
  return new Date().toISOString();
}

function matches<TStatus extends string>(
  value: { organizationId: string; status?: TStatus; slotId?: string; employeeId?: string; unitId?: string; facilityId?: string },
  query: {
    organizationId: string;
    statuses?: TStatus[];
    slotId?: string;
    employeeId?: string;
    unitId?: string;
    facilityId?: string;
  }
) {
  if (value.organizationId !== query.organizationId) {
    return false;
  }
  if (query.statuses && value.status && !query.statuses.includes(value.status)) {
    return false;
  }
  if (query.slotId && value.slotId !== query.slotId) {
    return false;
  }
  if (query.employeeId && value.employeeId !== query.employeeId) {
    return false;
  }
  if (query.unitId && value.unitId !== query.unitId) {
    return false;
  }
  if (query.facilityId && value.facilityId !== query.facilityId) {
    return false;
  }
  return true;
}

@Injectable()
export class InMemoryShiftPipelineRepository implements ShiftPipelineRepository {
  async listSlots(query: ShiftSlotQuery) {
    return demoShiftSlots.filter((slot) => matches(slot, query));
  }

  async findSlot(query: { organizationId: string; slotId: string }) {
    return demoShiftSlots.find((slot) => slot.organizationId === query.organizationId && slot.id === query.slotId) ?? null;
  }

  async createSlot(input: Omit<ShiftSlotContract, "id"> & { id?: string }) {
    const slot: ShiftSlotContract = {
      ...input,
      id: input.id ?? `slot_${demoShiftSlots.length + 1}`
    };
    demoShiftSlots.push(slot);
    return slot;
  }

  async updateSlotStatus(input: {
    organizationId: string;
    slotId: string;
    status: ShiftSlotStatus;
    riskFlags?: string[];
  }) {
    const slot = await this.findSlot(input);
    if (!slot) {
      throw new Error(`Shift slot not found: ${input.slotId}`);
    }
    slot.status = input.status;
    if (input.riskFlags) {
      slot.riskFlags = input.riskFlags;
    }
    return slot;
  }

  async listClaims(query: ShiftClaimQuery) {
    return demoShiftClaims.filter((claim) => matches(claim, query));
  }

  async createClaim(input: Omit<ShiftClaimRequestContract, "id" | "createdAt"> & { id?: string; createdAt?: string }) {
    const claim: ShiftClaimRequestContract = {
      ...input,
      id: input.id ?? `claim_${demoShiftClaims.length + 1}`,
      createdAt: input.createdAt ?? nowIso()
    };
    demoShiftClaims.push(claim);
    return claim;
  }

  async updateClaim(input: {
    organizationId: string;
    claimId: string;
    status: ShiftClaimStatus;
    approvalRequestId?: string;
    assignmentId?: string;
    decidedAt?: string;
  }) {
    const claim = demoShiftClaims.find(
      (candidate) => candidate.organizationId === input.organizationId && candidate.id === input.claimId
    );
    if (!claim) {
      throw new Error(`Shift claim not found: ${input.claimId}`);
    }
    claim.status = input.status;
    if (input.approvalRequestId) {
      claim.approvalRequestId = input.approvalRequestId;
    }
    if (input.assignmentId) {
      claim.assignmentId = input.assignmentId;
    }
    if (input.decidedAt) {
      claim.decidedAt = input.decidedAt;
    }
    return claim;
  }

  async listAssignments(query: ShiftAssignmentQuery) {
    return demoShiftAssignments.filter((assignment) => matches(assignment, query));
  }

  async findActiveAssignmentForSlot(query: { organizationId: string; slotId: string }) {
    return (
      demoShiftAssignments.find(
        (assignment) =>
          assignment.organizationId === query.organizationId &&
          assignment.slotId === query.slotId &&
          assignment.status === "ACTIVE"
      ) ?? null
    );
  }

  async createAssignment(input: Omit<ShiftAssignmentContract, "id" | "createdAt"> & { id?: string; createdAt?: string }) {
    const assignment: ShiftAssignmentContract = {
      ...input,
      id: input.id ?? `assignment_${demoShiftAssignments.length + 1}`,
      createdAt: input.createdAt ?? nowIso()
    };
    demoShiftAssignments.push(assignment);
    return assignment;
  }

  async updateAssignment(input: {
    organizationId: string;
    assignmentId: string;
    status: ShiftAssignmentStatus;
    endedAt?: string;
  }) {
    const assignment = demoShiftAssignments.find(
      (candidate) => candidate.organizationId === input.organizationId && candidate.id === input.assignmentId
    );
    if (!assignment) {
      throw new Error(`Shift assignment not found: ${input.assignmentId}`);
    }
    assignment.status = input.status;
    if (input.endedAt) {
      assignment.endedAt = input.endedAt;
    }
    return assignment;
  }
}

function mapPrismaSlot(slot: Record<string, unknown>): ShiftSlotContract {
  return {
    id: String(slot.id),
    organizationId: String(slot.organizationId),
    facilityId: String(slot.facilityId),
    unitId: String(slot.unitId),
    ...(slot.requirementId ? { requirementId: String(slot.requirementId) } : {}),
    roleRequiredId: String(slot.roleRequiredId),
    certificationRequiredIds: slot.certificationRequiredIds as string[],
    startsAt: (slot.startAt as Date).toISOString(),
    endsAt: (slot.endAt as Date).toISOString(),
    status: slot.status as ShiftSlotStatus,
    source: slot.source as ShiftSlotContract["source"],
    riskFlags: slot.riskFlags as string[]
  };
}

function mapPrismaClaim(claim: Record<string, unknown>): ShiftClaimRequestContract {
  return {
    id: String(claim.id),
    organizationId: String(claim.organizationId),
    slotId: String(claim.slotId),
    employeeId: String(claim.employeeId),
    userId: String(claim.userId),
    status: claim.status as ShiftClaimStatus,
    policyDecision: claim.policyDecision as ShiftClaimRequestContract["policyDecision"],
    ...(claim.approvalRequestId ? { approvalRequestId: String(claim.approvalRequestId) } : {}),
    ...(claim.assignmentId ? { assignmentId: String(claim.assignmentId) } : {}),
    createdAt: (claim.createdAt as Date).toISOString(),
    ...(claim.decidedAt ? { decidedAt: (claim.decidedAt as Date).toISOString() } : {}),
    ...(claim.expiresAt ? { expiresAt: (claim.expiresAt as Date).toISOString() } : {})
  };
}

function mapPrismaAssignment(assignment: Record<string, unknown>): ShiftAssignmentContract {
  return {
    id: String(assignment.id),
    organizationId: String(assignment.organizationId),
    slotId: String(assignment.slotId),
    employeeId: String(assignment.employeeId),
    assignedByUserId: String(assignment.assignedByUserId),
    status: assignment.status as ShiftAssignmentStatus,
    source: assignment.source as ShiftAssignmentContract["source"],
    createdAt: (assignment.createdAt as Date).toISOString(),
    ...(assignment.endedAt ? { endedAt: (assignment.endedAt as Date).toISOString() } : {})
  };
}

@Injectable()
export class PrismaShiftPipelineRepository implements ShiftPipelineRepository {
  private readonly client = prisma as unknown as {
    shiftSlot: PrismaModelFacade;
    shiftClaimRequest: PrismaModelFacade;
    shiftAssignment: PrismaModelFacade;
  };

  async listSlots(query: ShiftSlotQuery) {
    const rows = await this.client.shiftSlot.findMany({
      where: {
        organizationId: query.organizationId,
        ...(query.slotId ? { id: query.slotId } : {}),
        ...(query.unitId ? { unitId: query.unitId } : {}),
        ...(query.facilityId ? { facilityId: query.facilityId } : {}),
        ...(query.statuses ? { status: { in: query.statuses } } : {})
      },
      orderBy: { startAt: "asc" }
    });
    return (rows as Record<string, unknown>[]).map(mapPrismaSlot);
  }

  async findSlot(query: { organizationId: string; slotId: string }) {
    const slot = await this.client.shiftSlot.findFirst({
      where: { organizationId: query.organizationId, id: query.slotId }
    });
    return slot ? mapPrismaSlot(slot as Record<string, unknown>) : null;
  }

  async createSlot(input: Omit<ShiftSlotContract, "id"> & { id?: string }) {
    const slot = await this.client.shiftSlot.create({
      data: {
        ...input,
        ...(input.id ? { id: input.id } : {}),
        startAt: new Date(input.startsAt),
        endAt: new Date(input.endsAt)
      }
    });
    return mapPrismaSlot(slot as Record<string, unknown>);
  }

  async updateSlotStatus(input: { organizationId: string; slotId: string; status: ShiftSlotStatus; riskFlags?: string[] }) {
    const slot = await this.client.shiftSlot.update({
      where: { id: input.slotId },
      data: { status: input.status, ...(input.riskFlags ? { riskFlags: input.riskFlags } : {}) }
    });
    return mapPrismaSlot(slot as Record<string, unknown>);
  }

  async listClaims(query: ShiftClaimQuery) {
    const rows = await this.client.shiftClaimRequest.findMany({
      where: {
        organizationId: query.organizationId,
        ...(query.slotId ? { slotId: query.slotId } : {}),
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...(query.statuses ? { status: { in: query.statuses } } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    return (rows as Record<string, unknown>[]).map(mapPrismaClaim);
  }

  async createClaim(input: Omit<ShiftClaimRequestContract, "id" | "createdAt"> & { id?: string; createdAt?: string }) {
    const claim = await this.client.shiftClaimRequest.create({
      data: {
        ...input,
        ...(input.id ? { id: input.id } : {}),
        ...(input.createdAt ? { createdAt: new Date(input.createdAt) } : {}),
        ...(input.decidedAt ? { decidedAt: new Date(input.decidedAt) } : {}),
        ...(input.expiresAt ? { expiresAt: new Date(input.expiresAt) } : {})
      }
    });
    return mapPrismaClaim(claim as Record<string, unknown>);
  }

  async updateClaim(input: {
    organizationId: string;
    claimId: string;
    status: ShiftClaimStatus;
    approvalRequestId?: string;
    assignmentId?: string;
    decidedAt?: string;
  }) {
    const claim = await this.client.shiftClaimRequest.update({
      where: { id: input.claimId },
      data: {
        status: input.status,
        ...(input.approvalRequestId ? { approvalRequestId: input.approvalRequestId } : {}),
        ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
        ...(input.decidedAt ? { decidedAt: new Date(input.decidedAt) } : {})
      }
    });
    return mapPrismaClaim(claim as Record<string, unknown>);
  }

  async listAssignments(query: ShiftAssignmentQuery) {
    const rows = await this.client.shiftAssignment.findMany({
      where: {
        organizationId: query.organizationId,
        ...(query.slotId ? { slotId: query.slotId } : {}),
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...(query.statuses ? { status: { in: query.statuses } } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    return (rows as Record<string, unknown>[]).map(mapPrismaAssignment);
  }

  async findActiveAssignmentForSlot(query: { organizationId: string; slotId: string }) {
    const assignment = await this.client.shiftAssignment.findFirst({
      where: { organizationId: query.organizationId, slotId: query.slotId, status: "ACTIVE" }
    });
    return assignment ? mapPrismaAssignment(assignment as Record<string, unknown>) : null;
  }

  async createAssignment(input: Omit<ShiftAssignmentContract, "id" | "createdAt"> & { id?: string; createdAt?: string }) {
    const assignment = await this.client.shiftAssignment.create({
      data: {
        ...input,
        ...(input.id ? { id: input.id } : {}),
        ...(input.createdAt ? { createdAt: new Date(input.createdAt) } : {}),
        ...(input.endedAt ? { endedAt: new Date(input.endedAt) } : {})
      }
    });
    return mapPrismaAssignment(assignment as Record<string, unknown>);
  }

  async updateAssignment(input: {
    organizationId: string;
    assignmentId: string;
    status: ShiftAssignmentStatus;
    endedAt?: string;
  }) {
    const assignment = await this.client.shiftAssignment.update({
      where: { id: input.assignmentId },
      data: {
        status: input.status,
        ...(input.endedAt ? { endedAt: new Date(input.endedAt) } : {})
      }
    });
    return mapPrismaAssignment(assignment as Record<string, unknown>);
  }
}

@Injectable()
export class ShiftPipelineRepositoryProvider {
  private readonly inMemory = new InMemoryShiftPipelineRepository();
  private readonly prismaRepository = new PrismaShiftPipelineRepository();

  repository(): ShiftPipelineRepository {
    return process.env.WORKFLOW_PERSISTENCE === "prisma" ? this.prismaRepository : this.inMemory;
  }
}
