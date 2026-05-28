import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { appendDemoAuditLog, type DemoTimecardEventRecord } from "./demo-data";
import { TimeclockRepositoryProvider } from "./timeclock.repository";

@Injectable()
export class TimeclockService {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(TimeclockRepositoryProvider) private readonly repositories: TimeclockRepositoryProvider
  ) {}

  async status(session: DemoSession) {
    this.assertAllowed(session, "timecard:read:self");
    const repository = this.repositories.repository();
    const employeeId = await this.employeeIdFor(session);
    const events = (await repository.eventsForEmployee(employeeId, session.userId)).sort((a, b) =>
      a.occurredAt.localeCompare(b.occurredAt)
    );
    const lastEvent = events.at(-1);
    const currentShift = await repository.currentShiftForEmployee(employeeId, session.userId);
    return {
      employeeId,
      status: lastEvent?.eventType === "CLOCK_IN" ? "CLOCKED_IN" : "CLOCKED_OUT",
      currentShiftId: currentShift?.id ?? null,
      currentShiftTitle: currentShift?.title ?? null,
      lastEvent: lastEvent ?? null
    };
  }

  async events(session: DemoSession) {
    this.assertAllowed(session, "timecard:read:self");
    const employeeId = await this.employeeIdFor(session);
    return (await this.repositories.repository().eventsForEmployee(employeeId, session.userId)).sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt)
    );
  }

  async clockIn(session: DemoSession, body: { occurredAt?: string; shiftId?: string }) {
    this.assertAllowed(session, "timecard:write:self");
    if ((await this.status(session)).status === "CLOCKED_IN") {
      throw new BadRequestException("Employee is already clocked in");
    }

    const event = await this.recordEvent(session, "CLOCK_IN", body.occurredAt, body.shiftId);
    appendDemoAuditLog({
      actorUserId: session.userId,
      actorType: "USER",
      action: "timecard.clock_in",
      objectType: "TimecardEvent",
      objectId: event.id,
      after: { event }
    });
    return { status: "CLOCKED_IN", event };
  }

  async clockOut(session: DemoSession, body: { occurredAt?: string }) {
    this.assertAllowed(session, "timecard:write:self");
    const currentStatus = await this.status(session);
    if (currentStatus.status !== "CLOCKED_IN") {
      throw new BadRequestException("Employee is not clocked in");
    }

    const event = await this.recordEvent(
      session,
      "CLOCK_OUT",
      body.occurredAt,
      currentStatus.currentShiftId ?? undefined
    );
    appendDemoAuditLog({
      actorUserId: session.userId,
      actorType: "USER",
      action: "timecard.clock_out",
      objectType: "TimecardEvent",
      objectId: event.id,
      after: { event }
    });
    return { status: "CLOCKED_OUT", event };
  }

  private async employeeIdFor(session: DemoSession) {
    const employeeId = await this.repositories.repository().employeeIdForUser(session.userId);
    if (!employeeId) {
      throw new BadRequestException("Demo user does not have an employee profile");
    }
    return employeeId;
  }

  private async recordEvent(
    session: DemoSession,
    eventType: DemoTimecardEventRecord["eventType"],
    occurredAt?: string,
    shiftId?: string
  ) {
    const input = {
      employeeId: await this.employeeIdFor(session),
      userId: session.userId,
      eventType,
      occurredAt: occurredAt ?? new Date().toISOString()
    };
    return this.repositories.repository().recordEvent(
      shiftId ? { ...input, shiftId } : input
    );
  }

  private assertAllowed(
    session: DemoSession,
    permission: Parameters<PermissionService["hasPermission"]>[1]
  ) {
    if (
      !this.permissions.hasPermission(session, permission, {
        type: "SELF",
        userId: session.userId
      })
    ) {
      throw new ForbiddenException({
        message: "Forbidden by PulseShift scoped permissions",
        userId: session.userId,
        role: session.role
      });
    }
  }
}
