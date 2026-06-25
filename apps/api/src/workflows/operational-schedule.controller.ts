import { Controller, Get, Inject } from "@nestjs/common";
import { prisma } from "@pulseshift/db";

import {
  demoEmployeeByUserId
} from "../demo/demo-data";
import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { scopeQueryForSession } from "../auth/scope-query";
import { WorkspaceContextService } from "../auth/workspace-context.service";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";

@Controller("schedule")
export class OperationalScheduleController {
  constructor(
    @Inject(ShiftPipelineRepositoryProvider)
    private readonly repositories: ShiftPipelineRepositoryProvider,
    @Inject(WorkspaceContextService)
    private readonly workspaceContext: WorkspaceContextService
  ) {}

  @Get("me")
  mySchedule(@CurrentSession() session: DemoSession) {
    return this.list(session, true);
  }

  @Get("visible")
  visibleSchedule(@CurrentSession() session: DemoSession) {
    return this.list(session, session.role === "EMPLOYEE");
  }

  private async list(session: DemoSession, selfOnly: boolean) {
    const repository = this.repositories.repository();
    const context = await this.workspaceContext.getContext(session);
    const scope = scopeQueryForSession(session, context, "schedule");
    const [slots, assignments, employeeId] = await Promise.all([
      repository.listSlots({
        organizationId: session.organizationId,
        ...(scope.unitId ? { unitId: scope.unitId } : {}),
        ...(scope.facilityId ? { facilityId: scope.facilityId } : {})
      }),
      repository.listAssignments({
        organizationId: session.organizationId,
        statuses: ["ACTIVE"]
      }),
      selfOnly ? this.employeeIdForUser(session) : Promise.resolve(undefined)
    ]);
    const assignmentBySlot = new Map(
      assignments.map((assignment) => [assignment.slotId, assignment])
    );
    return slots
      .filter((slot) => {
        if (!selfOnly) return true;
        return assignmentBySlot.get(slot.id)?.employeeId === employeeId;
      })
      .map((slot) => {
        const assignment = assignmentBySlot.get(slot.id);
        return {
          id: slot.id,
          ...(assignment ? { employeeId: assignment.employeeId } : {}),
          unitId: slot.unitId,
          facilityId: slot.facilityId,
          title: slot.roleRequiredId.replace(/^role_/, "").replaceAll("_", " "),
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          status: slot.status,
          riskFlags: slot.riskFlags
        };
      });
  }

  private async employeeIdForUser(session: DemoSession) {
    if (process.env.WORKFLOW_PERSISTENCE !== "prisma") {
      return demoEmployeeByUserId.get(session.userId);
    }
    return (
      await prisma.employeeProfile.findFirst({
        where: {
          organizationId: session.organizationId,
          userId: session.userId
        },
        select: { id: true }
      })
    )?.id;
  }
}
