import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { ScheduleRepositoryProvider } from "./schedule.repository";

@Injectable()
export class ScheduleService {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(ScheduleRepositoryProvider) private readonly repositories: ScheduleRepositoryProvider
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
    if (
      this.permissions.hasPermission(session, "schedule:read:facility", {
        type: "FACILITY",
        facilityId: "fac_mercy_main"
      })
    ) {
      return repository.findFacilitySchedule({
        organizationId: session.organizationId,
        facilityId: "fac_mercy_main"
      });
    }

    if (
      this.permissions.hasPermission(session, "schedule:read:unit", {
        type: "UNIT",
        unitId: "unit_icu"
      })
    ) {
      return repository.findUnitSchedule({
        organizationId: session.organizationId,
        unitId: "unit_icu"
      });
    }

    return this.mySchedule(session);
  }

  async unitSchedule(session: DemoSession, unitId: string) {
    this.assertAllowed(
      session,
      this.permissions.hasPermission(session, "schedule:read:unit", {
        type: "UNIT",
        unitId
      })
    );

    return this.repositories.repository().findUnitSchedule({
      organizationId: session.organizationId,
      unitId
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
