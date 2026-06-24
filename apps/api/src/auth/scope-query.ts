import type { DemoSession } from "./demo-users";
import type { WorkspaceContext } from "./workspace-context.service";

export type ScopedResource =
  | "schedule"
  | "staffing"
  | "staff"
  | "approvals"
  | "reports";

export type ScopedQuery = {
  organizationId: string;
  facilityId?: string;
  unitId?: string;
  userId?: string;
};

export function scopeQueryForSession(
  session: DemoSession,
  context: WorkspaceContext,
  resource: ScopedResource
): ScopedQuery {
  const selfScoped =
    session.grants.some((grant) => grant.scope.type === "SELF") &&
    !session.grants.some(
      (grant) =>
        grant.scope.type === "UNIT" ||
        grant.scope.type === "FACILITY" ||
        grant.scope.type === "ORG"
    );
  if (selfScoped) {
    const activeUnit = context.units.find(
      (unit) => unit.id === context.activeSelection.unitId
    );
    return {
      organizationId: session.organizationId,
      ...(activeUnit
        ? { facilityId: activeUnit.facilityId, unitId: activeUnit.id }
        : {}),
      userId: session.userId
    };
  }

  const activeUnit = context.units.find(
    (unit) => unit.id === context.activeSelection.unitId
  );
  if (activeUnit) {
    return {
      organizationId: session.organizationId,
      facilityId: activeUnit.facilityId,
      unitId: activeUnit.id
    };
  }

  const activeFacility = context.facilities.find(
    (facility) => facility.id === context.activeSelection.facilityId
  );
  if (activeFacility) {
    return {
      organizationId: session.organizationId,
      facilityId: activeFacility.id
    };
  }

  if (resource === "schedule" && session.role === "EMPLOYEE") {
    return {
      organizationId: session.organizationId,
      userId: session.userId
    };
  }
  return { organizationId: session.organizationId };
}
