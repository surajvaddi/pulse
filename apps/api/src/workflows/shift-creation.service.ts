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

  async publishDraftSlots(session: DemoSession, input: { facilityId: string; slotIds: string[] }) {
    this.assertCanPublish(session, input.facilityId);
    if (input.slotIds.length === 0) {
      throw new BadRequestException("At least one draft slot is required to publish.");
    }

    const repository = this.repositories.repository();
    const published = [];
    for (const slotId of input.slotIds) {
      const slot = await repository.findSlot({ organizationId: session.organizationId, slotId });
      if (!slot) {
        throw new BadRequestException(`Cannot publish missing slot: ${slotId}`);
      }
      if (slot.facilityId !== input.facilityId) {
        throw new ForbiddenException("Cannot publish a shift outside the requested facility.");
      }
      if (slot.status !== "DRAFT") {
        throw new BadRequestException(`Only draft slots can be published: ${slotId}`);
      }
      published.push(
        await repository.updateSlotStatus({
          organizationId: session.organizationId,
          slotId,
          status: "OPEN",
          riskFlags: slot.riskFlags
        })
      );
    }
    return published;
  }

  async lockPublishedSlots(session: DemoSession, input: { facilityId: string; slotIds: string[]; reason: string }) {
    this.assertCanPublish(session, input.facilityId);
    if (input.slotIds.length === 0) {
      throw new BadRequestException("At least one slot is required to lock.");
    }
    if (!input.reason.trim()) {
      throw new BadRequestException("A lock reason is required.");
    }

    const repository = this.repositories.repository();
    const locked = [];
    for (const slotId of input.slotIds) {
      const slot = await repository.findSlot({ organizationId: session.organizationId, slotId });
      if (!slot) {
        throw new BadRequestException(`Cannot lock missing slot: ${slotId}`);
      }
      if (slot.facilityId !== input.facilityId) {
        throw new ForbiddenException("Cannot lock a shift outside the requested facility.");
      }
      if (!["OPEN", "ASSIGNED", "PUBLISHED"].includes(slot.status)) {
        throw new BadRequestException(`Only open, assigned, or published slots can be locked: ${slotId}`);
      }
      locked.push(
        await repository.updateSlotStatus({
          organizationId: session.organizationId,
          slotId,
          status: "LOCKED",
          riskFlags: [...new Set([...slot.riskFlags, "SCHEDULE_LOCKED"])]
        })
      );
    }
    return locked;
  }

  private assertCanCreateDraft(session: DemoSession, facilityId: string) {
    if (!this.permissions.hasPermission(session, "schedule:write:draft", { type: "FACILITY", facilityId })) {
      throw new ForbiddenException("User cannot create draft shifts for this facility.");
    }
  }

  private assertCanPublish(session: DemoSession, facilityId: string) {
    if (!this.permissions.hasPermission(session, "schedule:publish", { type: "FACILITY", facilityId })) {
      throw new ForbiddenException("User cannot publish or lock shifts for this facility.");
    }
  }

  private assertValidTimeRange(startsAt: string, endsAt: string) {
    if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
      throw new BadRequestException("Shift start time must be before end time.");
    }
  }
}
