import { Body, Controller, Get, Inject, Post } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { TimeclockService } from "./timeclock.service";

@Controller("timeclock")
export class TimeclockController {
  constructor(@Inject(TimeclockService) private readonly timeclock: TimeclockService) {}

  @Get("status")
  status(@CurrentSession() session: DemoSession) {
    return this.timeclock.status(session);
  }

  @Get("events")
  events(@CurrentSession() session: DemoSession) {
    return this.timeclock.events(session);
  }

  @Post("clock-in")
  clockIn(
    @CurrentSession() session: DemoSession,
    @Body() body: { occurredAt?: string; shiftId?: string }
  ) {
    return this.timeclock.clockIn(session, body);
  }

  @Post("clock-out")
  clockOut(@CurrentSession() session: DemoSession, @Body() body: { occurredAt?: string }) {
    return this.timeclock.clockOut(session, body);
  }
}
