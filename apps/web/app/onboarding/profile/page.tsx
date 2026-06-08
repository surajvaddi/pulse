import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";

import { upsertProfileAction } from "../../account-actions";
import { apiGet, type AdminFacility, type AdminUnit, type SessionSummary } from "@/lib/api";

export default async function ProfileOnboardingPage() {
  const [session, facilities, units] = await Promise.all([
    apiGet<SessionSummary>("/auth/me"),
    apiGet<AdminFacility[]>("/admin/facilities"),
    apiGet<AdminUnit[]>("/admin/units")
  ]);
  const firstFacility = facilities.at(0);
  const facilityUnits = firstFacility ? units.filter((unit) => unit.facilityId === firstFacility.id) : units;
  const firstUnit = facilityUnits.at(0);

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Profile Setup</p>
          <h1>Confirm workforce details.</h1>
          <p>
            Link your Supabase account to a workforce profile so schedules, timecards, swaps, and notifications can use real organization data.
          </p>
        </div>

        {!firstFacility || !firstUnit ? (
          <div className="detail-stack">
            <article className="list-row">
              <div>
                <strong>Facility and unit required</strong>
                <span>Create at least one facility and unit before building workforce profiles.</span>
              </div>
              <BadgeCheck size={18} aria-hidden="true" />
            </article>
            <Link className="command-button" href="/app/admin/facilities">
              <ArrowRight size={18} aria-hidden="true" />
              Set up facilities
            </Link>
          </div>
        ) : (
          <form action={upsertProfileAction} className="auth-form">
            <label htmlFor="legalName">Legal name</label>
            <input id="legalName" name="legalName" type="text" defaultValue={session.displayName} />
            <label htmlFor="preferredName">Preferred name</label>
            <input id="preferredName" name="preferredName" type="text" defaultValue={session.displayName} />
            <label htmlFor="employeeNumber">Employee number</label>
            <input id="employeeNumber" name="employeeNumber" type="text" placeholder="EMP-1001" />
            <label htmlFor="facilityId">Home facility</label>
            <select id="facilityId" name="facilityId" defaultValue={firstFacility.id}>
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
            <label htmlFor="unitId">Home unit</label>
            <select id="unitId" name="unitId" defaultValue={firstUnit.id}>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
            <label htmlFor="roleName">Workforce role</label>
            <input id="roleName" name="roleName" type="text" defaultValue="RN" />
            <label htmlFor="employmentType">Employment type</label>
            <select id="employmentType" name="employmentType" defaultValue="FULL_TIME">
              <option value="FULL_TIME">Full time</option>
              <option value="PART_TIME">Part time</option>
              <option value="PER_DIEM">Per diem</option>
              <option value="CONTRACT">Contract</option>
              <option value="AGENCY">Agency</option>
            </select>
            <button className="command-button" type="submit">
              <ArrowRight size={18} aria-hidden="true" />
              Save profile
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
