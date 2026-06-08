import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { StaffingRequirementContract } from "@pulseshift/domain";

import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";

export type CreateDraftSlotInput = {
  facilityId: string;
  unitId: string;
  roleRequiredId: string;
  certificationRequiredIds: string[];
  startsAt: string;
  endsAt: string;
  requirementId?: string;
  riskFlags?: string[];
};

@Injectable()
export class ShiftCreationService {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(ShiftPipelineRepositoryProvider) private readonly repositories: ShiftPipelineRepositoryProvider
  ) {}

  async createDraftSlot(session: DemoSession, input: CreateDraftSlotInput) {
    this.assertCanCreateDraft(session, input.facilityId);
    this.assertValidTimeRange(input.startsAt, input.endsAt);

    return this.repositories.repository().createSlot({
      organizationId: session.organizationId,
      facilityId: input.facilityId,
      unitId: input.unitId,
      ...(input.requirementId ? { requirementId: input.requirementId } : {}),
      roleRequiredId: input.roleRequiredId,
      certificationRequiredIds: input.certificationRequiredIds,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: "DRAFT",
      source: "MANUAL",
      riskFlags: input.riskFlags ?? []
    });
  }

  async createSlotsFromRequirement(session: DemoSession, requirement: StaffingRequirementContract) {
    this.assertCanCreateDraft(session, requirement.facilityId);
    this.assertValidTimeRange(requirement.startAt, requirement.endAt);

    const count = Math.max(requirement.minRequired, requirement.idealRequired ?? 0);
    if (count <= 0) {
      throw new BadRequestException("Staffing requirement must request at least one slot.");
    }

    const repository = this.repositories.repository();
    const slots = [];
    for (let index = 0; index < count; index += 1) {
      slots.push(
        await repository.createSlot({
          id: `${requirement.id}_slot_${index + 1}`,
          organizationId: session.organizationId,
          facilityId: requirement.facilityId,
          unitId: requirement.unitId,
          requirementId: requirement.id,
          roleRequiredId: requirement.roleId,
          certificationRequiredIds: requirement.certificationRequiredIds,
          startsAt: requirement.startAt,
          endsAt: requirement.endAt,
          status: "DRAFT",
          source: "TEMPLATE",
          riskFlags: []
        })
      );
    }
    return slots;
  }

  private assertCanCreateDraft(session: DemoSession, facilityId: string) {
    if (!this.permissions.hasPermission(session, "schedule:write:draft", { type: "FACILITY", facilityId })) {
      throw new ForbiddenException("User cannot create draft shifts for this facility.");
    }
  }

  private assertValidTimeRange(startsAt: string, endsAt: string) {
    if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
      throw new BadRequestException("Shift start time must be before end time.");
    }
  }
}
