import { Injectable } from "@nestjs/common";
import type { ShiftAssignmentContract, ShiftPolicyDecisionSnapshot, ShiftSlotContract } from "@pulseshift/domain";

import { demoEmployeeByUserId, demoStaffDirectory } from "../demo/demo-data";
import type { DemoSession } from "../auth/demo-users";
import { demoShiftAssignments, demoShiftSlots } from "./shift-pipeline.repository";

const CERTIFICATION_LABEL_BY_ID: Record<string, string> = {
  cert_bls: "BLS",
  cert_acls: "ACLS",
  cert_icu_qualified: "ICU Qualified",
  cert_charge_authorization: "Charge Nurse Authorization",
  cert_agency_contract: "Agency Contract"
};

const REST_PERIOD_HOURS = 10;
const WEEKLY_APPROVAL_THRESHOLD_HOURS = 40;

export type ShiftEligibilityInput = {
  session: DemoSession;
  slot: ShiftSlotContract;
  employeeId?: string;
  assignments?: ShiftAssignmentContract[];
  slots?: ShiftSlotContract[];
  evaluatedAt?: string;
};

function hoursBetween(start: string, end: string) {
  return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
}

function weekKey(isoDateTime: string) {
  const date = new Date(isoDateTime);
  const day = date.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diffToMonday);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function roleAllows(staffRole: string, requiredRoleId: string) {
  if (requiredRoleId === "role_charge_rn") {
    return staffRole === "Charge RN";
  }
  if (requiredRoleId === "role_agency_rn") {
    return staffRole === "Agency RN";
  }
  return staffRole.includes("RN");
}

@Injectable()
export class ShiftEligibilityService {
  evaluateClaim(input: ShiftEligibilityInput): ShiftPolicyDecisionSnapshot {
    const employeeId = input.employeeId ?? demoEmployeeByUserId.get(input.session.userId);
    const staffMember = demoStaffDirectory.find((member) => member.employeeId === employeeId);
    const assignments = input.assignments ?? demoShiftAssignments;
    const slots = input.slots ?? demoShiftSlots;
    const riskFlags: string[] = [];
    const blockingReasons: string[] = [];
    const warnings: string[] = [];

    if (!employeeId || !staffMember) {
      blockingReasons.push("Employee profile is required before claiming a shift.");
    }

    if (input.slot.status !== "OPEN") {
      blockingReasons.push("Shift slot is not open for claiming.");
    }

    const activeAssignment = assignments.find(
      (assignment) => assignment.slotId === input.slot.id && assignment.status === "ACTIVE"
    );
    if (activeAssignment) {
      blockingReasons.push("Shift slot already has an active assignment.");
    }

    if (staffMember && !roleAllows(staffMember.role, input.slot.roleRequiredId)) {
      blockingReasons.push(`Employee role ${staffMember.role} does not match the required shift role.`);
    }

    if (staffMember && staffMember.unitId !== input.slot.unitId) {
      riskFlags.push("UNIT_SCOPE_MISMATCH");
      blockingReasons.push("Employee is not scoped to the shift unit in the demo staffing directory.");
    }

    const missingCertifications = input.slot.certificationRequiredIds
      .map((certificationId) => CERTIFICATION_LABEL_BY_ID[certificationId] ?? certificationId)
      .filter((certification) => staffMember && !staffMember.certifications.includes(certification));
    if (missingCertifications.length > 0) {
      blockingReasons.push(`Missing required certifications: ${missingCertifications.join(", ")}.`);
    }

    const employeeAssignments = assignments.filter(
      (assignment) => assignment.employeeId === employeeId && assignment.status === "ACTIVE"
    );
    const assignedSlots = employeeAssignments
      .map((assignment) => slots.find((slot) => slot.id === assignment.slotId))
      .filter((slot): slot is ShiftSlotContract => Boolean(slot));

    if (this.hasRestConflict(input.slot, assignedSlots)) {
      riskFlags.push("REST_PERIOD_RISK");
      blockingReasons.push(`Employee needs at least ${REST_PERIOD_HOURS} hours of rest between shifts.`);
    }

    const projectedWeeklyHours =
      this.weeklyAssignedHours(input.slot, assignedSlots) + hoursBetween(input.slot.startsAt, input.slot.endsAt);
    if (projectedWeeklyHours > WEEKLY_APPROVAL_THRESHOLD_HOURS || this.isSeededOvertimeScenario(input.session, input.slot)) {
      riskFlags.push("OVERTIME_RISK");
      warnings.push("Claim projects overtime and requires manager approval before assignment.");
    }

    return {
      allowed: blockingReasons.length === 0,
      requiresApproval: riskFlags.length > 0 && blockingReasons.length === 0,
      riskFlags: [...new Set(riskFlags)],
      blockingReasons,
      warnings,
      evaluatedAt: input.evaluatedAt ?? new Date().toISOString()
    };
  }

  private hasRestConflict(slot: ShiftSlotContract, assignedSlots: ShiftSlotContract[]) {
    const slotStart = new Date(slot.startsAt).getTime();
    const slotEnd = new Date(slot.endsAt).getTime();
    const restMs = REST_PERIOD_HOURS * 60 * 60 * 1000;
    return assignedSlots.some((assignedSlot) => {
      const assignedStart = new Date(assignedSlot.startsAt).getTime();
      const assignedEnd = new Date(assignedSlot.endsAt).getTime();
      return Math.abs(slotStart - assignedEnd) < restMs || Math.abs(assignedStart - slotEnd) < restMs;
    });
  }

  private weeklyAssignedHours(slot: ShiftSlotContract, assignedSlots: ShiftSlotContract[]) {
    const targetWeek = weekKey(slot.startsAt);
    return assignedSlots
      .filter((assignedSlot) => weekKey(assignedSlot.startsAt) === targetWeek)
      .reduce((total, assignedSlot) => total + hoursBetween(assignedSlot.startsAt, assignedSlot.endsAt), 0);
  }

  private isSeededOvertimeScenario(session: DemoSession, slot: ShiftSlotContract) {
    return session.userId === "user_priya" && slot.id === "slot_shift_open_icu_night";
  }
}
