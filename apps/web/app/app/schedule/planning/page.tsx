import {
  apiGetSession,
  type InvitationOptions,
  type ShiftPipelineSlot,
  type WorkspaceContext
} from "@/lib/api";
import {
  createDraftShiftAction,
  expandStaffingRequirementAction,
  lockScheduleSlotsAction,
  publishDraftShiftsAction
} from "../../actions";

export default async function SchedulePlanningPage() {
  const [context, options, slots] = await Promise.all([
    apiGetSession<WorkspaceContext>(
      "/auth/workspace-context",
      "user_wendy_workforce"
    ),
    apiGetSession<InvitationOptions>(
      "/onboarding/invitation-options",
      "user_wendy_workforce"
    ),
    apiGetSession<ShiftPipelineSlot[]>(
      "/shift-pipeline/slots?statuses=DRAFT,OPEN,PUBLISHED,ASSIGNED,LOCKED",
      "user_wendy_workforce"
    )
  ]);
  const facilityId = context.activeSelection.facilityId ?? "";
  const unitId = context.activeSelection.unitId ?? "";
  const activeSlots = slots.filter(
    (slot) => !facilityId || slot.facilityId === facilityId
  );
  const drafts = activeSlots.filter((slot) => slot.status === "DRAFT");
  const publishable = activeSlots.filter((slot) =>
    ["OPEN", "PUBLISHED", "ASSIGNED"].includes(slot.status)
  );

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Schedule Planning</p>
        <h1>Build and publish coverage</h1>
        <p>Create draft slots, expand staffing requirements, then validate and publish the selected batch.</p>
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="section-heading"><h2>Create draft slot</h2></div>
          <form action={createDraftShiftAction} className="detail-stack">
            <input type="hidden" name="facilityId" value={facilityId} />
            <input type="hidden" name="unitId" value={unitId} />
            <select name="roleRequiredId" required>
              {options.workforceRoles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <input name="startsAt" type="datetime-local" required />
            <input name="endsAt" type="datetime-local" required />
            <button className="command-button" type="submit">Create draft</button>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading"><h2>Expand requirement</h2></div>
          <form action={expandStaffingRequirementAction} className="detail-stack">
            <input type="hidden" name="facilityId" value={facilityId} />
            <input type="hidden" name="unitId" value={unitId} />
            <select name="roleRequiredId" required>
              {options.workforceRoles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <input name="startsAt" type="datetime-local" required />
            <input name="endsAt" type="datetime-local" required />
            <input name="minRequired" type="number" min="1" defaultValue="1" required />
            <input name="idealRequired" type="number" min="1" defaultValue="1" required />
            <button className="command-button" type="submit">Expand slots</button>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <h2>Draft validation and publish</h2>
          <span>{drafts.length} drafts</span>
        </div>
        <form action={publishDraftShiftsAction} className="detail-stack">
          <input type="hidden" name="facilityId" value={facilityId} />
          {drafts.map((slot) => (
            <label className="list-row" key={slot.id}>
              <input type="checkbox" name="slotId" value={slot.id} />
              <span>
                <strong>{slot.roleRequiredId}</strong>
                <span>{new Date(slot.startsAt).toLocaleString()} to {new Date(slot.endsAt).toLocaleString()}</span>
              </span>
            </label>
          ))}
          {!drafts.length ? <p className="empty-state">No draft slots in this facility.</p> : null}
          <label>
            <input type="checkbox" name="confirmed" required /> Confirm publish for selected slots
          </label>
          <button className="command-button" type="submit" disabled={!drafts.length}>Validate and publish</button>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading"><h2>Lock finalized slots</h2></div>
        <form action={lockScheduleSlotsAction} className="detail-stack">
          <input type="hidden" name="facilityId" value={facilityId} />
          {publishable.map((slot) => (
            <label className="list-row" key={slot.id}>
              <input type="checkbox" name="slotId" value={slot.id} />
              <span><strong>{slot.roleRequiredId}</strong><span>{slot.status}</span></span>
            </label>
          ))}
          <input name="reason" placeholder="Schedule lock reason" required />
          <button className="secondary-button" type="submit" disabled={!publishable.length}>Lock selected</button>
        </form>
      </section>
    </section>
  );
}
