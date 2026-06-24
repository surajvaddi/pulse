import type { WorkspaceContext } from "@/lib/api";

export function workspaceContextView(context: WorkspaceContext) {
  const activeFacility = context.facilities.find(
    (facility) => facility.id === context.activeSelection.facilityId
  );
  const units = context.units.filter(
    (unit) => unit.facilityId === activeFacility?.id
  );
  const activeUnit = units.find(
    (unit) => unit.id === context.activeSelection.unitId
  );
  return {
    activeFacility,
    activeUnit,
    units,
    showFacilitySelector: context.facilities.length > 1,
    showUnitSelector: units.length > 1,
    hasOptions: context.facilities.length > 0 || context.units.length > 0
  };
}
