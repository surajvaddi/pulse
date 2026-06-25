import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { ShiftSlotContract } from "@pulseshift/domain";

import type { DemoSession } from "../auth/demo-users";
import { scopeQueryForSession } from "../auth/scope-query";
import { WorkspaceContextService } from "../auth/workspace-context.service";
import type { AssignmentCandidate } from "./assignment-candidate";
import { ShiftManagerService } from "./shift-manager.service";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";

export type OpenShiftFilters = {
  dateFrom?: string;
  dateTo?: string;
  facilityId?: string;
  unitId?: string;
  roleId?: string;
  minDurationHours?: number;
  maxDurationHours?: number;
  qualification?: "eligible" | "all";
  overtimeRisk?: "exclude" | "include";
};

export type OpenShiftResult = {
  slot: ShiftSlotContract;
  eligibility: AssignmentCandidate | null;
};

function parseDate(value: string | undefined, label: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${label} must be a valid date.`);
  }
  return date;
}

function durationHours(slot: ShiftSlotContract) {
  return (
    (new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime()) /
    3_600_000
  );
}

export function applyOpenShiftFilters(
  results: OpenShiftResult[],
  filters: OpenShiftFilters
) {
  const from = parseDate(filters.dateFrom, "dateFrom");
  const to = parseDate(filters.dateTo, "dateTo");
  if (from && to && from > to) {
    throw new BadRequestException("dateFrom must be before dateTo.");
  }
  return results.filter(({ slot, eligibility }) => {
    const startsAt = new Date(slot.startsAt);
    const hours = durationHours(slot);
    if (from && startsAt < from) return false;
    if (to && startsAt > to) return false;
    if (filters.roleId && slot.roleRequiredId !== filters.roleId) return false;
    if (filters.minDurationHours && hours < filters.minDurationHours) return false;
    if (filters.maxDurationHours && hours > filters.maxDurationHours) return false;
    if (filters.qualification === "eligible" && eligibility?.eligibility === "BLOCKED") {
      return false;
    }
    if (
      filters.overtimeRisk === "exclude" &&
      eligibility?.riskFlags.includes("OVERTIME_RISK")
    ) {
      return false;
    }
    return true;
  });
}

@Injectable()
export class OpenShiftService {
  constructor(
    @Inject(ShiftPipelineRepositoryProvider)
    private readonly repositories: ShiftPipelineRepositoryProvider,
    @Inject(WorkspaceContextService)
    private readonly workspaceContext: WorkspaceContextService,
    @Inject(ShiftManagerService)
    private readonly managers: ShiftManagerService
  ) {}

  async list(session: DemoSession, filters: OpenShiftFilters) {
    const context = await this.workspaceContext.getContext(session);
    const scope = scopeQueryForSession(session, context, "schedule");
    if (
      filters.facilityId &&
      !context.facilities.some((facility) => facility.id === filters.facilityId)
    ) {
      throw new BadRequestException("Facility filter is outside your workspace access.");
    }
    if (
      filters.unitId &&
      !context.units.some((unit) => unit.id === filters.unitId)
    ) {
      throw new BadRequestException("Unit filter is outside your workspace access.");
    }
    const slots = await this.repositories.repository().listSlots({
      organizationId: scope.organizationId,
      ...(filters.facilityId
        ? { facilityId: filters.facilityId }
        : scope.facilityId
          ? { facilityId: scope.facilityId }
          : {}),
      ...(filters.unitId
        ? { unitId: filters.unitId }
        : scope.unitId
          ? { unitId: scope.unitId }
          : {}),
      statuses: ["OPEN", "CLAIM_PENDING"]
    });
    const results = await Promise.all(
      slots.map(async (slot) => ({
        slot,
        eligibility:
          (await this.managers.evaluateCurrentUserForSlot(session, slot.id)) ?? null
      }))
    );
    return applyOpenShiftFilters(results, filters);
  }
}
