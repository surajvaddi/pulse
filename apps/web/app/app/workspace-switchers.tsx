"use client";

import { useRef } from "react";

import { updateWorkspaceContextAction } from "@/app/app/actions";
import type { WorkspaceContext } from "@/lib/api";
import { workspaceContextView } from "@/lib/workspace-context-view";

export function WorkspaceSwitchers({
  context
}: {
  context: WorkspaceContext;
}) {
  const facilityForm = useRef<HTMLFormElement>(null);
  const unitForm = useRef<HTMLFormElement>(null);
  const view = workspaceContextView(context);

  if (!view.hasOptions) {
    return <span className="workspace-empty">No workspace scope</span>;
  }

  return (
    <div className="switchers">
      {view.showFacilitySelector ? (
        <form ref={facilityForm} action={updateWorkspaceContextAction}>
          <select
            aria-label="Facility"
            name="facilityId"
            value={view.activeFacility?.id ?? ""}
            onChange={() => facilityForm.current?.requestSubmit()}
          >
            {context.facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
        </form>
      ) : (
        <span className="workspace-label">{view.activeFacility?.name}</span>
      )}

      {view.showUnitSelector ? (
        <form ref={unitForm} action={updateWorkspaceContextAction}>
          <input
            type="hidden"
            name="facilityId"
            value={view.activeFacility?.id ?? ""}
          />
          <select
            aria-label="Unit"
            name="unitId"
            value={view.activeUnit?.id ?? ""}
            onChange={() => unitForm.current?.requestSubmit()}
          >
            {view.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </form>
      ) : (
        <span className="workspace-label">{view.activeUnit?.name}</span>
      )}
    </div>
  );
}
