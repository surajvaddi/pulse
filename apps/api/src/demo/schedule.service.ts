import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { ScheduleRepositoryProvider } from "./schedule.repository";
import { WorkspaceContextService } from "../auth/workspace-context.service";
import { scopeQueryForSession } from "../auth/scope-query";

@Injectable()
export class ScheduleService {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(ScheduleRepositoryProvider) private readonly repositories: ScheduleRepositoryProvider,
    @Inject(WorkspaceContextService)
    private readonly workspaceContext: WorkspaceContextService
  ) {}

  async mySchedule(session: DemoSession) {
    this.assertAllowed(
      session,
      this.permissions.hasPermission(session, "schedule:read:self", {
        type: "SELF",
        userId: session.userId
      })
    );

    const employeeId = await this.repositories.repository().employeeIdForUser(session.userId);
    if (!employeeId) {
      throw new BadRequestException("User does not have an employee profile");
    }

    return this.repositories.repository().findMySchedule({
      organizationId: session.organizationId,
      employeeId
    });
  }

  async visibleSchedule(session: DemoSession) {
    const repository = this.repositories.repository();
    const context = await this.workspaceContext.getContext(session);
    const query = scopeQueryForSession(session, context, "schedule");
    if (query.userId) {
      return this.mySchedule(session);
    }
    if (query.unitId) {
      return repository.findUnitSchedule({
        organizationId: query.organizationId,
        unitId: query.unitId
      });
    }
    if (query.facilityId) {
      return repository.findFacilitySchedule({
        organizationId: query.organizationId,
        facilityId: query.facilityId
      });
    }
    return this.mySchedule(session);
  }

  async unitSchedule(session: DemoSession, unitId: string) {
    const context = await this.workspaceContext.getContext(session);
    const query = scopeQueryForSession(session, context, "schedule");
    this.assertAllowed(
      session,
      query.unitId === unitId &&
        this.permissions.hasPermission(session, "schedule:read:unit", {
          type: "UNIT",
          unitId
        })
    );
    if (!query.unitId) {
      throw new ForbiddenException("Active workspace does not include a unit.");
    }

    return this.repositories.repository().findUnitSchedule({
      organizationId: query.organizationId,
      unitId: query.unitId
    });
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
