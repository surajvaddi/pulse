import { ForbiddenException, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { CurrentSession } from "../auth/session.decorator";
import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import {
  demoAIToolCalls,
  demoAuditLogs,
  demoEmployeeByUserId,
  demoSchedules,
  demoTimecardExceptions,
  resetDemoWorkflowState
} from "./demo-data";

@Controller("demo")
export class DemoController {
  constructor(@Inject(PermissionService) private readonly permissions: PermissionService) {}

  @Get("schedule/me")
  mySchedule(@CurrentSession() session: DemoSession) {
    this.assertAllowed(
      session,
      this.permissions.hasPermission(session, "schedule:read:self", {
        type: "SELF",
        userId: session.userId
      })
    );

    const employeeId = demoEmployeeByUserId.get(session.userId);
    return demoSchedules.filter((shift) => shift.employeeId === employeeId);
  }

  @Get("schedule/unit/:unitId")
  unitSchedule(@CurrentSession() session: DemoSession, @Param("unitId") unitId: string) {
    this.assertAllowed(
      session,
      this.permissions.hasPermission(session, "schedule:read:unit", {
        type: "UNIT",
        unitId
      })
    );

    return demoSchedules.filter((shift) => shift.unitId === unitId);
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
