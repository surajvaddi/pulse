import { Inject, Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";

import {
  demoEmployeeByUserId,
  demoSchedules,
  demoTimecardEvents,
  type DemoTimecardEventRecord
} from "./demo-data";

export type TimeclockEventInput = {
  employeeId: string;
  userId: string;
  eventType: DemoTimecardEventRecord["eventType"];
  occurredAt: string;
  shiftId?: string;
};

export type TimeclockCurrentShift = {
  id: string;
  title: string;
} | null;

export interface TimeclockRepository {
  employeeIdForUser(userId: string): Promise<string | undefined>;
  eventsForEmployee(employeeId: string, userId: string): Promise<DemoTimecardEventRecord[]>;
  currentShiftForEmployee(employeeId: string, userId: string): Promise<TimeclockCurrentShift>;
  recordEvent(input: TimeclockEventInput): Promise<DemoTimecardEventRecord>;
}

@Injectable()
export class InMemoryTimeclockRepository implements TimeclockRepository {
  async employeeIdForUser(userId: string) {
    return demoEmployeeByUserId.get(userId);
  }

  async eventsForEmployee(employeeId: string) {
    return demoTimecardEvents.filter((event) => event.employeeId === employeeId);
  }

  async currentShiftForEmployee(_employeeId: string, userId: string) {
    const shift = demoSchedules.find((candidate) => candidate.userId === userId);
    return shift ? { id: shift.id, title: shift.title } : null;
  }

  async recordEvent(input: TimeclockEventInput) {
    const event: DemoTimecardEventRecord = {
      id: `timecard_event_${demoTimecardEvents.length + 1}`,
      employeeId: input.employeeId,
      userId: input.userId,
      eventType: input.eventType,
      occurredAt: input.occurredAt,
      source: "MOBILE",
      status: "NORMAL"
    };
    if (input.shiftId) {
      event.shiftId = input.shiftId;
    }
    demoTimecardEvents.push(event);
    return event;
  }
}

@Injectable()
export class PrismaTimeclockRepository implements TimeclockRepository {
  async employeeIdForUser(userId: string) {
    const employee = await prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    return employee?.id;
  }

  async eventsForEmployee(employeeId: string, userId: string) {
    const events = await prisma.timecardEvent.findMany({
      where: { employeeId },
      orderBy: { occurredAt: "asc" }
    });
    return events.map((event) => {
      const result: DemoTimecardEventRecord = {
        id: event.id,
        employeeId: event.employeeId,
        userId,
        eventType: event.eventType,
        occurredAt: event.occurredAt.toISOString(),
        source: event.source,
        status: event.status
      };
      if (event.shiftId) {
        result.shiftId = event.shiftId;
      }
      return result;
    });
  }

  async currentShiftForEmployee(employeeId: string) {
    const shift = await prisma.shift.findFirst({
      where: {
        assignedEmployeeId: employeeId,
        status: { in: ["PUBLISHED", "ASSIGNED", "IN_PROGRESS"] }
      },
      orderBy: { startAt: "asc" },
      select: { id: true, roleRequired: { select: { name: true } }, unit: { select: { name: true } } }
    });
    return shift ? { id: shift.id, title: `${shift.unit.name} ${shift.roleRequired.name}` } : null;
  }

  async recordEvent(input: TimeclockEventInput) {
    const event = await prisma.timecardEvent.create({
      data: {
        employeeId: input.employeeId,
        ...(input.shiftId ? { shiftId: input.shiftId } : {}),
        eventType: input.eventType,
        occurredAt: new Date(input.occurredAt),
        source: "MOBILE",
        status: "NORMAL"
      }
    });
    const result: DemoTimecardEventRecord = {
      id: event.id,
      employeeId: event.employeeId,
      userId: input.userId,
      eventType: event.eventType,
      occurredAt: event.occurredAt.toISOString(),
      source: event.source,
      status: event.status
    };
    if (event.shiftId) {
      result.shiftId = event.shiftId;
    }
    return result;
  }
}

@Injectable()
export class TimeclockRepositoryProvider {
  constructor(
    @Inject(InMemoryTimeclockRepository) private readonly memory: InMemoryTimeclockRepository,
    @Inject(PrismaTimeclockRepository) private readonly persistent: PrismaTimeclockRepository
  ) {}

  repository() {
    return process.env.WORKFLOW_PERSISTENCE === "prisma" ? this.persistent : this.memory;
  }
}
