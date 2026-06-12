import { Building2 } from "lucide-react";
import { UnitTypeSchema } from "@pulseshift/domain";

import { bootstrapStructureAction } from "../../account-actions";
import { requireOnboardingStep } from "@/lib/onboarding-guards";

const unitTypeOptions = UnitTypeSchema.options;

export default async function StructureOnboardingPage() {
  const { claims } = await requireOnboardingStep("/onboarding/structure");

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Facility Setup</p>
          <h1>Add your first facility and unit.</h1>
          <p>
            Start with one site and department. You can add more branches and units later from administration.
          </p>
          <p className="form-note">Signed in as {claims.email ?? claims.sub}</p>
        </div>

        <form action={bootstrapStructureAction} className="auth-form">
          <label htmlFor="facilityName">Facility name</label>
          <input id="facilityName" name="facilityName" type="text" placeholder="Mercy Main Hospital" required />
          <label htmlFor="facilityTimezone">Facility timezone</label>
          <input id="facilityTimezone" name="facilityTimezone" type="text" placeholder="America/New_York" required />
          <label htmlFor="unitName">Unit name</label>
          <input id="unitName" name="unitName" type="text" placeholder="Intensive Care Unit" required />
          <label htmlFor="unitType">Unit type</label>
          <select id="unitType" name="unitType" required defaultValue="">
            <option value="" disabled>
              Select a unit type
            </option>
            {unitTypeOptions.map((unitType) => (
              <option key={unitType} value={unitType}>
                {unitType.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button className="command-button" type="submit">
            <Building2 size={18} aria-hidden="true" />
            Save facility and unit
          </button>
        </form>
      </section>
    </main>
  );
}
