import { ForbiddenException, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { CurrentSession } from "../auth/session.decorator";
import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import {
  demoAIToolCalls,
  resetDemoWorkflowState
} from "./demo-data";
import { AuditService } from "./audit.service";
import { OperationsService } from "./operations.service";
import { ScheduleService } from "./schedule.service";
import { prisma } from "@pulseshift/db";

function demoResetAllowed() {
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.ENABLE_DEMO_RESET !== "false";
}

@Controller("demo")
export class DemoController {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(AuditService) private readonly auditLogs: AuditService,
    @Inject(OperationsService) private readonly operations: OperationsService,
    @Inject(ScheduleService) private readonly schedules: ScheduleService
  ) {}

  @Get("schedule/me")
  mySchedule(@CurrentSession() session: DemoSession) {
    return this.schedules.mySchedule(session);
  }

  @Get("schedule/visible")
  visibleSchedule(@CurrentSession() session: DemoSession) {
    return this.schedules.visibleSchedule(session);
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

    return this.operations.timecardExceptions(session);
  }

  @Get("audit")
  audit(@CurrentSession() session: DemoSession) {
    this.assertAllowed(
      session,
      this.permissions.hasPermission(session, "ai:admin", {
        type: "ORG",
        organizationId: session.organizationId
      })
    );

    return this.auditLogs.list(session.organizationId);
  }

  @Get("ai-tool-calls")
  aiToolCalls(@CurrentSession() session: DemoSession) {
    const orgScope = { type: "ORG", organizationId: session.organizationId } as const;
    this.assertAllowed(
      session,
      this.permissions.hasPermission(session, "ai:admin", orgScope) ||
        this.permissions.hasPermission(session, "audit:read", orgScope)
    );

    if (process.env.WORKFLOW_PERSISTENCE === "prisma") {
      return prisma.aIToolCall.findMany({
        where: { user: { organizationId: session.organizationId } },
        orderBy: { createdAt: "desc" },
        take: 100
      });
    }
    return demoAIToolCalls;
  }

  @Post("reset")
  async reset(@CurrentSession() session: DemoSession) {
    if (!demoResetAllowed()) {
      throw new ForbiddenException("Demo reset is disabled in this environment");
    }

    this.assertAllowed(
      session,
      this.permissions.hasPermission(session, "ai:admin", {
        type: "ORG",
        organizationId: session.organizationId
      })
    );

    resetDemoWorkflowState();
    const auditLogs = await this.auditLogs.list(session.organizationId);
    return {
      status: "RESET",
      swaps: 0,
      approvals: 0,
      auditLogs: auditLogs.length,
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
