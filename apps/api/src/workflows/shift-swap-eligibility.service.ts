import { BadRequestException, Injectable } from "@nestjs/common";
import type { OperationalShiftContract, ShiftAssignmentContract, ShiftSlotContract, ShiftSwapCandidateContract } from "@pulseshift/domain";
import { operationalShiftFromSlot } from "@pulseshift/domain";

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

function hoursBetween(start: string, end: string) {
  return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
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
export class ShiftSwapEligibilityService {
  listOperationalShifts(input: {
    organizationId: string;
    employeeId?: string;
    slots?: ShiftSlotContract[];
    assignments?: ShiftAssignmentContract[];
  }): OperationalShiftContract[] {
    const slots = input.slots ?? demoShiftSlots;
    const assignments = input.assignments ?? demoShiftAssignments;
    return slots
      .filter((slot) => slot.organizationId === input.organizationId)
      .map((slot) =>
        operationalShiftFromSlot({
          slot,
          assignment: assignments.find((assignment) => assignment.slotId === slot.id && assignment.status === "ACTIVE") ?? null
        })
      )
      .filter((shift) => !input.employeeId || shift.employeeId === input.employeeId);
  }

  listSwappableShifts(session: DemoSession): OperationalShiftContract[] {
    const employeeId = demoEmployeeByUserId.get(session.userId);
    if (!employeeId) {
      return [];
    }
    return this.listOperationalShifts({ organizationId: session.organizationId, employeeId }).filter((shift) =>
      this.originalShiftIsSwappable(session, shift).allowed
    );
  }

  evaluateOriginalShift(session: DemoSession, originalSlotId: string) {
    const employeeId = demoEmployeeByUserId.get(session.userId);
    const originalShift = this.listOperationalShifts({ organizationId: session.organizationId }).find(
      (shift) => shift.slotId === originalSlotId
    );
    if (!originalShift) {
      throw new BadRequestException("Original shift is not visible in the operational schedule.");
    }
    const decision = this.originalShiftIsSwappable(session, originalShift);
    if (originalShift.employeeId !== employeeId) {
      decision.blockingReasons.push("Requester can only swap their own assigned shift.");
      decision.allowed = false;
    }
    return { originalShift, decision };
  }

  listCandidates(session: DemoSession, originalSlotId: string): ShiftSwapCandidateContract[] {
    const { originalShift, decision } = this.evaluateOriginalShift(session, originalSlotId);
    if (!decision.allowed) {
      return [];
    }
    return demoStaffDirectory
      .filter((member) => Boolean(member.userId))
      .map((member) => this.evaluateCandidate(session, originalShift, member.userId ?? ""));
  }

  evaluateCandidate(session: DemoSession, originalShift: OperationalShiftContract, candidateUserId: string): ShiftSwapCandidateContract {
    const evaluatedAt = new Date().toISOString();
    const staff = demoStaffDirectory.find((member) => member.userId === candidateUserId);
    const riskFlags: string[] = ["MANAGER_APPROVAL_REQUIRED"];
    const blockingReasons: string[] = [];
    const warnings: string[] = ["Accepted swaps require manager approval before schedule changes."];

    if (!staff?.userId) {
      blockingReasons.push("Candidate does not have an active user profile.");
    }
    if (candidateUserId === session.userId) {
      blockingReasons.push("Candidate cannot be the requesting employee.");
    }
    if (staff && staff.unitId !== originalShift.unitId) {
      riskFlags.push("UNIT_SCOPE_MISMATCH");
      blockingReasons.push("Candidate is not scoped to the original shift unit.");
    }
    if (staff && !roleAllows(staff.role, originalShift.roleRequiredId)) {
      blockingReasons.push(`Candidate role ${staff.role} does not match the shift role.`);
    }
    const missingCertifications = originalShift.certificationRequiredIds
      .map((certificationId) => CERTIFICATION_LABEL_BY_ID[certificationId] ?? certificationId)
      .filter((certification) => staff && !staff.certifications.includes(certification));
    if (missingCertifications.length > 0) {
      blockingReasons.push(`Missing required certifications: ${missingCertifications.join(", ")}.`);
    }
    if (staff && this.hasRestConflict(staff.employeeId, originalShift)) {
      riskFlags.push("REST_PERIOD_RISK");
      blockingReasons.push("Candidate has an assigned shift too close to the original shift.");
    }
    if (staff?.overtimeRisk === "MEDIUM") {
      riskFlags.push("OVERTIME_RISK");
      warnings.push("Candidate has projected overtime risk.");
    }

    return {
      userId: candidateUserId,
      employeeId: staff?.employeeId ?? "",
      displayName: staff?.name ?? candidateUserId,
      eligible: blockingReasons.length === 0,
      requiresApproval: true,
      riskFlags: [...new Set(riskFlags)],
      blockingReasons,
      warnings,
      evaluatedAt
    };
  }

  private originalShiftIsSwappable(session: DemoSession, shift: OperationalShiftContract) {
    const decision = {
      allowed: true,
      blockingReasons: [] as string[]
    };
    if (!shift.swappable) {
      decision.blockingReasons.push("Only assigned or published shifts can be swapped.");
    }
    if (shift.status === "LOCKED") {
      decision.blockingReasons.push("Locked shifts cannot be swapped.");
    }
    if (shift.status === "COMPLETED" || shift.status === "CANCELLED") {
      decision.blockingReasons.push("Completed or cancelled shifts cannot be swapped.");
    }
    if (new Date(shift.startsAt).getTime() <= Date.now()) {
      decision.blockingReasons.push("Past or in-progress shifts cannot be swapped.");
    }
    if (!session.grants.some((grant) => grant.permission === "shift:swap:create")) {
      decision.blockingReasons.push("Requester does not have shift swap permission.");
    }
    decision.allowed = decision.blockingReasons.length === 0;
    return decision;
  }

  private hasRestConflict(employeeId: string, originalShift: OperationalShiftContract) {
    return this.listOperationalShifts({ organizationId: originalShift.organizationId, employeeId }).some((shift) => {
      if (shift.slotId === originalShift.slotId) {
        return false;
      }
      const gapBefore = Math.abs(new Date(originalShift.startsAt).getTime() - new Date(shift.endsAt).getTime());
      const gapAfter = Math.abs(new Date(shift.startsAt).getTime() - new Date(originalShift.endsAt).getTime());
      return Math.min(gapBefore, gapAfter) < hoursBetween("2026-01-01T00:00:00.000Z", "2026-01-01T10:00:00.000Z") * 60 * 60 * 1000;
    });
  }
}
