import { BadRequestException, Controller, Get, Inject, Post, Body, ForbiddenException } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { CurrentSession } from "../auth/session.decorator";
import {
  appendDemoAuditLog,
  demoEmployeeByUserId,
  demoSchedules,
  demoTimecardEvents,
  type DemoTimecardEventRecord
} from "./demo-data";

@Controller("timeclock")
export class TimeclockController {
  constructor(@Inject(PermissionService) private readonly permissions: PermissionService) {}

  @Get("status")
  status(@CurrentSession() session: DemoSession) {
    this.assertAllowed(session, "timecard:read:self");
    const employeeId = this.employeeIdFor(session);
    const events = this.eventsFor(session).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const lastEvent = events.at(-1);
    const currentShift = demoSchedules.find((shift) => shift.userId === session.userId);
    return {
      employeeId,
      status: lastEvent?.eventType === "CLOCK_IN" ? "CLOCKED_IN" : "CLOCKED_OUT",
      currentShiftId: currentShift?.id ?? null,
      currentShiftTitle: currentShift?.title ?? null,
      lastEvent: lastEvent ?? null
    };
  }

  @Get("events")
  events(@CurrentSession() session: DemoSession) {
    this.assertAllowed(session, "timecard:read:self");
    return this.eventsFor(session).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  @Post("clock-in")
  clockIn(
    @CurrentSession() session: DemoSession,
    @Body() body: { occurredAt?: string; shiftId?: string }
  ) {
    this.assertAllowed(session, "timecard:write:self");
    if (this.status(session).status === "CLOCKED_IN") {
      throw new BadRequestException("Employee is already clocked in");
    }

    const event = this.recordEvent(session, "CLOCK_IN", body.occurredAt, body.shiftId);
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

  @Post("clock-out")
  clockOut(@CurrentSession() session: DemoSession, @Body() body: { occurredAt?: string }) {
    this.assertAllowed(session, "timecard:write:self");
    const currentStatus = this.status(session);
    if (currentStatus.status !== "CLOCKED_IN") {
      throw new BadRequestException("Employee is not clocked in");
    }

    const event = this.recordEvent(
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

  private eventsFor(session: DemoSession) {
    const employeeId = this.employeeIdFor(session);
    return demoTimecardEvents.filter((event) => event.employeeId === employeeId);
  }

  private employeeIdFor(session: DemoSession) {
    const employeeId = demoEmployeeByUserId.get(session.userId);
    if (!employeeId) {
      throw new BadRequestException("Demo user does not have an employee profile");
    }
    return employeeId;
  }

  private recordEvent(
    session: DemoSession,
    eventType: DemoTimecardEventRecord["eventType"],
    occurredAt?: string,
    shiftId?: string
  ) {
    const event: DemoTimecardEventRecord = {
      id: `timecard_event_${demoTimecardEvents.length + 1}`,
      employeeId: this.employeeIdFor(session),
      userId: session.userId,
      eventType,
      occurredAt: occurredAt ?? new Date().toISOString(),
      source: "MOBILE",
      status: "NORMAL"
    };
    if (shiftId) {
      event.shiftId = shiftId;
    }
    demoTimecardEvents.push(event);
    return event;
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
