import { ForbiddenException, Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";
import type { Scope } from "@pulseshift/domain";

import type { DemoSession } from "./demo-users";

type WorkspaceFacility = { id: string; name: string };
type WorkspaceUnit = { id: string; name: string; facilityId: string };

export type WorkspaceContext = {
  facilities: WorkspaceFacility[];
  units: WorkspaceUnit[];
  defaultSelection: { facilityId?: string; unitId?: string };
  activeSelection: { facilityId?: string; unitId?: string };
  roleGrants: DemoSession["grants"];
};

export function permittedWorkspaceSelection(
  context: Pick<WorkspaceContext, "facilities" | "units">,
  requested: { facilityId?: string; unitId?: string }
): { facilityId?: string; unitId?: string } | null {
  const unit = requested.unitId
    ? context.units.find((candidate) => candidate.id === requested.unitId)
    : undefined;
  const facilityId = requested.facilityId ?? unit?.facilityId;
  const facility = facilityId
    ? context.facilities.find((candidate) => candidate.id === facilityId)
    : undefined;
  if (requested.unitId && !unit) {
    return null;
  }
  if (facilityId && !facility) {
    return null;
  }
  if (unit && facility && unit.facilityId !== facility.id) {
    return null;
  }
  const defaultUnit =
    unit ??
    (facility
      ? context.units.find(
          (candidate) => candidate.facilityId === facility.id
        )
      : context.units.at(0));
  const defaultFacility =
    facility ??
    context.facilities.find(
      (candidate) => candidate.id === defaultUnit?.facilityId
    ) ??
    context.facilities.at(0);
  return {
    ...(defaultFacility ? { facilityId: defaultFacility.id } : {}),
    ...(defaultUnit ? { unitId: defaultUnit.id } : {})
  };
}

export function resolveWorkspaceScope(input: {
  organizationId: string;
  scopes: Scope[];
  facilities: WorkspaceFacility[];
  units: WorkspaceUnit[];
  employeeProfile?: {
    primaryFacilityId: string;
    primaryUnitId: string;
  } | null;
}): Pick<WorkspaceContext, "facilities" | "units" | "defaultSelection"> {
  const organizationWide = input.scopes.some(
    (scope) =>
      scope.type === "ORG" &&
      scope.organizationId === input.organizationId
  );
  const allowedFacilityIds = new Set<string>();
  const facilityWideIds = new Set<string>();
  const allowedUnitIds = new Set<string>();

  if (organizationWide) {
    input.facilities.forEach((facility) => allowedFacilityIds.add(facility.id));
    input.facilities.forEach((facility) => facilityWideIds.add(facility.id));
    input.units.forEach((unit) => allowedUnitIds.add(unit.id));
  } else {
    for (const scope of input.scopes) {
      if (scope.type === "FACILITY") {
        scope.facilityIds.forEach((facilityId) => {
          allowedFacilityIds.add(facilityId);
          facilityWideIds.add(facilityId);
        });
      }
      if (scope.type === "UNIT") {
        scope.unitIds.forEach((unitId) => allowedUnitIds.add(unitId));
      }
      if (scope.type === "SELF" && input.employeeProfile) {
        allowedFacilityIds.add(input.employeeProfile.primaryFacilityId);
        allowedUnitIds.add(input.employeeProfile.primaryUnitId);
      }
    }
  }

  for (const unit of input.units) {
    if (facilityWideIds.has(unit.facilityId)) {
      allowedUnitIds.add(unit.id);
    }
    if (allowedUnitIds.has(unit.id)) {
      allowedFacilityIds.add(unit.facilityId);
    }
  }

  const facilities = input.facilities.filter((facility) =>
    allowedFacilityIds.has(facility.id)
  );
  const units = input.units.filter(
    (unit) =>
      allowedUnitIds.has(unit.id) && allowedFacilityIds.has(unit.facilityId)
  );
  const preferredUnit = input.employeeProfile
    ? units.find(
        (unit) => unit.id === input.employeeProfile?.primaryUnitId
      )
    : undefined;
  const defaultUnit = preferredUnit ?? units.at(0);
  const preferredFacility = input.employeeProfile
    ? facilities.find(
        (facility) =>
          facility.id === input.employeeProfile?.primaryFacilityId
      )
    : undefined;
  const defaultFacility =
    preferredFacility ??
    facilities.find((facility) => facility.id === defaultUnit?.facilityId) ??
    facilities.at(0);

  return {
    facilities,
    units,
    defaultSelection: {
      ...(defaultFacility ? { facilityId: defaultFacility.id } : {}),
      ...(defaultUnit ? { unitId: defaultUnit.id } : {})
    }
  };
}

@Injectable()
export class WorkspaceContextService {
  private readonly demoSelections = new Map<
    string,
    { facilityId?: string; unitId?: string }
  >();

  async getContext(session: DemoSession): Promise<WorkspaceContext> {
    if (session.userId.startsWith("user_")) {
      return this.demoContext(session);
    }
    const [facilities, units, employeeProfile, userPreference] = await Promise.all([
      prisma.facility.findMany({
        where: { organizationId: session.organizationId, status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true }
      }),
      prisma.unit.findMany({
        where: {
          facility: { organizationId: session.organizationId },
          status: "ACTIVE"
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, facilityId: true }
      }),
      prisma.employeeProfile.findUnique({
        where: { userId: session.userId },
        select: { primaryFacilityId: true, primaryUnitId: true }
      }),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { activeFacilityId: true, activeUnitId: true }
      })
    ]);
    const resolved = resolveWorkspaceScope({
      organizationId: session.organizationId,
      scopes: session.grants.map((grant) => grant.scope),
      facilities,
      units,
      employeeProfile
    });
    const storedSelection = permittedWorkspaceSelection(resolved, {
      ...(userPreference?.activeFacilityId
        ? { facilityId: userPreference.activeFacilityId }
        : {}),
      ...(userPreference?.activeUnitId
        ? { unitId: userPreference.activeUnitId }
        : {})
    });
    const activeSelection = storedSelection ?? resolved.defaultSelection;
    if (
      userPreference &&
      (userPreference.activeFacilityId !== activeSelection.facilityId ||
        userPreference.activeUnitId !== activeSelection.unitId)
    ) {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          activeFacilityId: activeSelection.facilityId ?? null,
          activeUnitId: activeSelection.unitId ?? null
        }
      });
    }
    return {
      ...resolved,
      activeSelection,
      roleGrants: session.grants
    };
  }

  async setContext(
    session: DemoSession,
    requested: { facilityId?: string; unitId?: string }
  ) {
    const context = await this.getContext(session);
    const selection = permittedWorkspaceSelection(context, requested);
    if (!selection) {
      throw new ForbiddenException(
        "Requested workspace is outside your current access."
      );
    }
    if (session.userId.startsWith("user_")) {
      this.demoSelections.set(session.userId, selection);
    } else {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          activeFacilityId: selection.facilityId ?? null,
          activeUnitId: selection.unitId ?? null
        }
      });
    }
    return { ...context, activeSelection: selection };
  }

  private demoContext(session: DemoSession): WorkspaceContext {
    const facilities = [
      { id: "fac_mercy_main", name: "Mercy Main Hospital" },
      { id: "fac_mercy_north", name: "Mercy North Clinic" }
    ];
    const units = [
      { id: "unit_icu", name: "Intensive Care Unit", facilityId: "fac_mercy_main" },
      { id: "unit_ed", name: "Emergency Department", facilityId: "fac_mercy_main" },
      { id: "unit_north", name: "North Clinic", facilityId: "fac_mercy_north" }
    ];
    const employeeProfile =
      session.role === "EMPLOYEE"
        ? { primaryFacilityId: "fac_mercy_main", primaryUnitId: "unit_icu" }
        : null;
    const resolved = resolveWorkspaceScope({
      organizationId: session.organizationId,
      scopes: session.grants.map((grant) => grant.scope),
      facilities,
      units,
      employeeProfile
    });
    const storedSelection = this.demoSelections.get(session.userId);
    const activeSelection =
      (storedSelection
        ? permittedWorkspaceSelection(resolved, storedSelection)
        : null) ?? resolved.defaultSelection;
    return {
      ...resolved,
      activeSelection,
      roleGrants: session.grants
    };
  }
}
