"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";

import { inviteWorkforceMemberAction } from "../../account-actions";
import { createAdminInvitationAction } from "@/app/app/actions";
import type { InvitationOptions } from "@/lib/api";
import {
  invitationRoleViewModel,
  invitationScopeLabel
} from "@/lib/invitation-view-model";

export function ScopedInvitationForm({
  options,
  mode = "onboarding"
}: {
  options: InvitationOptions;
  mode?: "onboarding" | "admin";
}) {
  const [role, setRole] = useState("EMPLOYEE");
  const [facilityId, setFacilityId] = useState(
    options.facilities.at(0)?.id ?? ""
  );
  const [unitId, setUnitId] = useState(
    options.units.find(
      (unit) => unit.facilityId === options.facilities.at(0)?.id
    )?.id ?? ""
  );
  const [employeeNumberPolicy, setEmployeeNumberPolicy] = useState("AUTO");
  const units = useMemo(
    () => options.units.filter((unit) => unit.facilityId === facilityId),
    [facilityId, options.units]
  );
  const roleView = invitationRoleViewModel(role);
  const requiresWorkforcePlacement = roleView.requiresWorkforcePlacement;
  const selectedFacility = options.facilities.find(
    (facility) => facility.id === facilityId
  );
  const selectedUnit = units.find((unit) => unit.id === unitId);
  const effectiveScope = invitationScopeLabel({
    scopeControl: roleView.scopeControl,
    ...(selectedFacility ? { facilityName: selectedFacility.name } : {}),
    ...(selectedUnit ? { unitName: selectedUnit.name } : {})
  });

  return (
    <form
      action={
        mode === "admin"
          ? createAdminInvitationAction
          : inviteWorkforceMemberAction
      }
      className="auth-form"
    >
      <label htmlFor="email">Invite email</label>
      <input id="email" name="email" type="email" placeholder="member@example.com" required />
      <label htmlFor="role">Account role</label>
      <select id="role" name="role" value={role} onChange={(event) => setRole(event.target.value)}>
        <option value="EMPLOYEE">Employee</option>
        <option value="CHARGE_NURSE">Charge nurse</option>
        <option value="UNIT_MANAGER">Unit manager</option>
        <option value="WORKFORCE_ADMIN">Workforce admin</option>
        <option value="FLOAT_POOL_COORDINATOR">Float pool coordinator</option>
        <option value="PAYROLL_ADMIN">Payroll admin</option>
        <option value="CREDENTIALING_ADMIN">Credentialing admin</option>
        <option value="COMPLIANCE_AUDITOR">Compliance auditor</option>
        <option value="EXECUTIVE_VIEWER">Executive viewer</option>
        <option value="SYSTEM_ADMIN">System admin</option>
      </select>

      {(requiresWorkforcePlacement || roleView.scopeControl === "FACILITY") ? (
        <>
          <label htmlFor="facilityId">Facility</label>
          <select
            id="facilityId"
            name="facilityId"
            value={facilityId}
            onChange={(event) => {
              const nextFacilityId = event.target.value;
              setFacilityId(nextFacilityId);
              setUnitId(
                options.units.find(
                  (unit) => unit.facilityId === nextFacilityId
                )?.id ?? ""
              );
            }}
            required
          >
            {options.facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>{facility.name}</option>
            ))}
          </select>
        </>
      ) : null}

      {requiresWorkforcePlacement ? (
        <>
          <label htmlFor="unitId">Unit</label>
          <select
            id="unitId"
            name="unitId"
            value={unitId}
            onChange={(event) => setUnitId(event.target.value)}
            required
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          <label htmlFor="workforceRoleId">Workforce role</label>
          <select id="workforceRoleId" name="workforceRoleId" required>
            {options.workforceRoles.map((workforceRole) => (
              <option key={workforceRole.id} value={workforceRole.id}>{workforceRole.name}</option>
            ))}
          </select>
          <label htmlFor="employmentType">Employment type</label>
          <select id="employmentType" name="employmentType" defaultValue="FULL_TIME">
            <option value="FULL_TIME">Full time</option>
            <option value="PART_TIME">Part time</option>
            <option value="PER_DIEM">Per diem</option>
            <option value="CONTRACT">Contract</option>
            <option value="AGENCY">Agency</option>
          </select>
          <label htmlFor="employeeNumberPolicy">Employee number</label>
          <select
            id="employeeNumberPolicy"
            name="employeeNumberPolicy"
            value={employeeNumberPolicy}
            onChange={(event) => setEmployeeNumberPolicy(event.target.value)}
          >
            <option value="AUTO">Generate automatically</option>
            <option value="ASSIGNED">Enter assigned number</option>
          </select>
          {employeeNumberPolicy === "ASSIGNED" ? (
            <input name="employeeNumber" placeholder="EMP-1001" required />
          ) : null}
        </>
      ) : null}

      <div className="list-row" aria-live="polite">
        <div>
          <strong>Effective access</strong>
          <span>{effectiveScope}</span>
        </div>
      </div>
      {mode === "admin" ? (
        <>
          <label htmlFor="reason">Audit reason</label>
          <input id="reason" name="reason" placeholder="Reason for access" required />
        </>
      ) : null}
      <button
        className="command-button"
        type="submit"
        disabled={
          requiresWorkforcePlacement &&
          (!units.length || !options.workforceRoles.length)
        }
      >
        <Send size={18} aria-hidden="true" />
        Send invite
      </button>
    </form>
  );
}
