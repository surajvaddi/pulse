import { ForbiddenException, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { CurrentSession } from "../auth/session.decorator";
import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import {
  demoAIToolCalls,
  demoAuditLogs,
  demoTimecardExceptions,
  resetDemoWorkflowState
} from "./demo-data";
import { ScheduleService } from "./schedule.service";

@Controller("demo")
export class DemoController {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(ScheduleService) private readonly schedules: ScheduleService
  ) {}

  @Get("schedule/me")
  mySchedule(@CurrentSession() session: DemoSession) {
    return this.schedules.mySchedule(session);
  }

  @Get("schedule/unit/:unitId")
  unitSchedule(@CurrentSession() session: DemoSession, @Param("unitId") unitId: string) {
    return this.schedules.unitSchedule(session, unitId);
  }

  @Get("timecards/exceptions")
  timecardExceptions(@CurrentSession() session: DemoSession) {
    const canReadUnit = this.permissions.hasPermission(session, "timecard:read:unit", {
      type: "UNIT",
      unitId: "unit_icu"
    });
    const canReadSelf = this.permissions.hasPermission(session, "timecard:read:self", {
      type: "SELF",
      userId: session.userId
    });

    this.assertAllowed(session, canReadUnit || canReadSelf);

    if (canReadUnit) {
      return demoTimecardExceptions;
    }

    return demoTimecardExceptions.filter((exception) => exception.userId === session.userId);
  }

  @Get("audit")
  audit(@CurrentSession() session: DemoSession) {
    this.assertAllowed(
      session,
      this.permissions.hasPermission(session, "audit:read", {
        type: "ORG",
        organizationId: session.organizationId
      })
    );

    return demoAuditLogs;
  }

  @Get("ai-tool-calls")
  aiToolCalls(@CurrentSession() session: DemoSession) {
    this.assertAllowed(
      session,
      this.permissions.hasPermission(session, "ai:admin", {
        type: "ORG",
        organizationId: session.organizationId
      })
    );

    return demoAIToolCalls;
  }

  @Post("reset")
  reset(@CurrentSession() session: DemoSession) {
    if (process.env.ENABLE_DEMO_RESET === "false") {
      throw new ForbiddenException("Demo reset is disabled in this environment");
    }

    this.assertAllowed(
      session,
      this.permissions.hasPermission(session, "audit:read", {
        type: "ORG",
        organizationId: session.organizationId
      })
    );

    resetDemoWorkflowState();
    return {
      status: "RESET",
      swaps: 0,
      approvals: 0,
      auditLogs: demoAuditLogs.length,
      aiToolCalls: demoAIToolCalls.length
    };
  }

  private assertAllowed(session: DemoSession, allowed: boolean): void {
    if (!allowed) {
      throw new ForbiddenException({
        message: "Forbidden by PulseShift scoped permissions",
        userId: session.userId,
        role: session.role
      });
    }
  }
}
