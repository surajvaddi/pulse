import { Inject, Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";

import {
  demoEmployeeByUserId,
  demoSchedules,
  type DemoShiftRecord
} from "./demo-data";
import type { ScheduleRepository } from "../workflows/repository-contracts";

function persistenceEnabled() {
  return process.env.WORKFLOW_PERSISTENCE === "prisma";
}

function titleForShift(shift: {
  roleRequired?: { name: string };
  unit?: { name: string };
}) {
  const unit = shift.unit?.name ?? "Unassigned";
  const role = shift.roleRequired?.name ?? "Shift";
  return `${unit} ${role}`;
}

function mapShiftStatus(status: "DRAFT" | "OPEN" | "ASSIGNED" | "PUBLISHED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"): DemoShiftRecord["status"] {
  if (status === "ASSIGNED" || status === "PUBLISHED") {
    return status;
  }
  return "OPEN";
}

export function mapPrismaShift(shift: {
  id: string;
  assignedEmployeeId: string | null;
  assignedEmployee?: { userId: string | null } | null;
  unitId: string;
  facilityId: string;
  startAt: Date;
  endAt: Date;
  status: "DRAFT" | "OPEN" | "ASSIGNED" | "PUBLISHED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  riskFlags: string[];
  roleRequired?: { name: string };
  unit?: { name: string };
}): DemoShiftRecord {
  const record: DemoShiftRecord = {
    id: shift.id,
    unitId: shift.unitId,
    facilityId: shift.facilityId,
    title: titleForShift(shift),
    startsAt: shift.startAt.toISOString(),
    endsAt: shift.endAt.toISOString(),
    status: mapShiftStatus(shift.status)
  };
  if (shift.assignedEmployeeId) {
    record.employeeId = shift.assignedEmployeeId;
  }
  if (shift.assignedEmployee?.userId) {
    record.userId = shift.assignedEmployee.userId;
  }
  if (shift.riskFlags.length > 0) {
    record.riskFlags = shift.riskFlags;
  }
  return record;
}

@Injectable()
export class InMemoryScheduleRepository implements ScheduleRepository {
  async findShift(query: { organizationId: string; shiftId: string }) {
    return demoSchedules.find((shift) => shift.id === query.shiftId) ?? null;
  }

  async findMySchedule(query: { organizationId: string; employeeId: string }) {
    return demoSchedules.filter((shift) => shift.employeeId === query.employeeId);
  }

  async findUnitSchedule(query: { organizationId: string; unitId: string }) {
    return demoSchedules.filter((shift) => shift.unitId === query.unitId);
  }

  async findOpenShifts(query: { organizationId: string; unitId?: string; facilityId?: string }) {
    return demoSchedules.filter((shift) => {
      if (shift.status !== "OPEN") {
        return false;
      }
      if (query.unitId && shift.unitId !== query.unitId) {
        return false;
      }
      if (query.facilityId && shift.facilityId !== query.facilityId) {
        return false;
      }
      return true;
    });
  }

  async assignShift(input: {
    organizationId: string;
    shiftId: string;
    employeeId: string;
    userId: string;
    status: "ASSIGNED" | "PUBLISHED";
  }) {
    const shift = demoSchedules.find((candidate) => candidate.id === input.shiftId);
    if (!shift) {
      throw new Error(`Schedule shift not found: ${input.shiftId}`);
    }
    shift.employeeId = input.employeeId;
    shift.userId = input.userId;
    shift.status = input.status;
    return shift;
  }

  employeeIdForUser(userId: string) {
    return demoEmployeeByUserId.get(userId);
  }
}

@Injectable()
export class PrismaScheduleRepository implements ScheduleRepository {
  async findShift(query: { organizationId: string; shiftId: string }) {
    const shift = await prisma.shift.findFirst({
      where: {
        id: query.shiftId,
        organizationId: query.organizationId
      },
      include: {
        assignedEmployee: { select: { userId: true } },
        roleRequired: { select: { name: true } },
        unit: { select: { name: true } }
      }
    });
    return shift ? mapPrismaShift(shift) : null;
  }

  async findMySchedule(query: { organizationId: string; employeeId: string }) {
    const shifts = await prisma.shift.findMany({
      where: {
        organizationId: query.organizationId,
        assignedEmployeeId: query.employeeId
      },
      include: {
        assignedEmployee: { select: { userId: true } },
        roleRequired: { select: { name: true } },
        unit: { select: { name: true } }
      },
      orderBy: { startAt: "asc" }
    });
    return shifts.map(mapPrismaShift);
  }

  async findUnitSchedule(query: { organizationId: string; unitId: string }) {
    const shifts = await prisma.shift.findMany({
      where: {
        organizationId: query.organizationId,
        unitId: query.unitId
      },
      include: {
        assignedEmployee: { select: { userId: true } },
        roleRequired: { select: { name: true } },
        unit: { select: { name: true } }
      },
      orderBy: { startAt: "asc" }
    });
    return shifts.map(mapPrismaShift);
  }

  async findOpenShifts(query: { organizationId: string; unitId?: string; facilityId?: string }) {
    const shifts = await prisma.shift.findMany({
      where: {
        organizationId: query.organizationId,
        status: "OPEN",
        ...(query.unitId ? { unitId: query.unitId } : {}),
        ...(query.facilityId ? { facilityId: query.facilityId } : {})
      },
      include: {
        assignedEmployee: { select: { userId: true } },
        roleRequired: { select: { name: true } },
        unit: { select: { name: true } }
      },
      orderBy: { startAt: "asc" }
    });
    return shifts.map(mapPrismaShift);
  }

  async assignShift(input: {
    organizationId: string;
    shiftId: string;
    employeeId: string;
    userId: string;
    status: "ASSIGNED" | "PUBLISHED";
  }) {
    const shift = await prisma.shift.update({
      where: {
        id: input.shiftId,
        organizationId: input.organizationId
      },
      data: {
        assignedEmployeeId: input.employeeId,
        status: input.status
      },
      include: {
        assignedEmployee: { select: { userId: true } },
        roleRequired: { select: { name: true } },
        unit: { select: { name: true } }
      }
    });
    return mapPrismaShift(shift);
  }

  async employeeIdForUser(userId: string) {
    const employee = await prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    return employee?.id;
  }
}

@Injectable()
export class ScheduleRepositoryProvider {
  constructor(
    @Inject(InMemoryScheduleRepository) private readonly memory: InMemoryScheduleRepository,
    @Inject(PrismaScheduleRepository) private readonly persistent: PrismaScheduleRepository
  ) {}

  repository() {
    return persistenceEnabled() ? this.persistent : this.memory;
  }
}
