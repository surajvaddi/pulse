import type { ShiftSlotContract } from "@pulseshift/domain";

const REST_PERIOD_HOURS = 10;
const WEEKLY_OVERTIME_HOURS = 40;

export type AssignmentCandidateInput = {
  employeeId: string;
  userId: string;
  displayName: string;
  accountActive: boolean;
  employeeActive: boolean;
  unitId: string;
  roleId: string;
  verifiedCertificationIds: string[];
  unavailableWindows: Array<{ startsAt: string; endsAt: string }>;
  assignedSlots: Array<{ id: string; startsAt: string; endsAt: string }>;
};

export type AssignmentCandidate = {
  employeeId: string;
  userId: string;
  displayName: string;
  eligibility: "ELIGIBLE" | "WARNING" | "BLOCKED";
  reasons: string[];
  riskFlags: string[];
};

function overlaps(
  left: { startsAt: string; endsAt: string },
  right: { startsAt: string; endsAt: string }
) {
  return (
    new Date(left.startsAt).getTime() < new Date(right.endsAt).getTime() &&
    new Date(right.startsAt).getTime() < new Date(left.endsAt).getTime()
  );
}

function hoursBetween(startsAt: string, endsAt: string) {
  return (
    (new Date(endsAt).getTime() - new Date(startsAt).getTime()) /
    (1000 * 60 * 60)
  );
}

function weekStart(value: string) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

export function evaluateAssignmentCandidate(
  slot: ShiftSlotContract,
  candidate: AssignmentCandidateInput
): AssignmentCandidate {
  const blocked: string[] = [];
  const warnings: string[] = [];
  const riskFlags: string[] = [];

  if (!candidate.accountActive) blocked.push("User account is not active.");
  if (!candidate.employeeActive) blocked.push("Employee profile is not active.");
  if (candidate.unitId !== slot.unitId) {
    blocked.push("Employee is assigned to a different unit.");
    riskFlags.push("UNIT_SCOPE_MISMATCH");
  }
  if (candidate.roleId !== slot.roleRequiredId) {
    blocked.push("Employee workforce role does not match the slot.");
  }

  const missingCertifications = slot.certificationRequiredIds.filter(
    (id) => !candidate.verifiedCertificationIds.includes(id)
  );
  if (missingCertifications.length) {
    blocked.push(
      `Missing verified certifications: ${missingCertifications.join(", ")}.`
    );
  }
  if (candidate.unavailableWindows.some((window) => overlaps(window, slot))) {
    blocked.push("Employee is unavailable during this shift.");
  }
  if (candidate.assignedSlots.some((assigned) => overlaps(assigned, slot))) {
    blocked.push("Employee has an overlapping active assignment.");
  }

  const restMs = REST_PERIOD_HOURS * 60 * 60 * 1000;
  const start = new Date(slot.startsAt).getTime();
  const end = new Date(slot.endsAt).getTime();
  const restConflict = candidate.assignedSlots.some((assigned) => {
    if (overlaps(assigned, slot)) return false;
    const assignedStart = new Date(assigned.startsAt).getTime();
    const assignedEnd = new Date(assigned.endsAt).getTime();
    return (
      Math.abs(start - assignedEnd) < restMs ||
      Math.abs(assignedStart - end) < restMs
    );
  });
  if (restConflict) {
    blocked.push(
      `Employee needs at least ${REST_PERIOD_HOURS} hours of rest between shifts.`
    );
    riskFlags.push("REST_PERIOD_RISK");
  }

  const targetWeek = weekStart(slot.startsAt);
  const weeklyHours = candidate.assignedSlots
    .filter((assigned) => weekStart(assigned.startsAt) === targetWeek)
    .reduce(
      (total, assigned) =>
        total + hoursBetween(assigned.startsAt, assigned.endsAt),
      hoursBetween(slot.startsAt, slot.endsAt)
    );
  if (weeklyHours > WEEKLY_OVERTIME_HOURS) {
    warnings.push(
      `Assignment projects ${weeklyHours.toFixed(1)} weekly hours and requires overtime review.`
    );
    riskFlags.push("OVERTIME_RISK");
  }

  return {
    employeeId: candidate.employeeId,
    userId: candidate.userId,
    displayName: candidate.displayName,
    eligibility: blocked.length
      ? "BLOCKED"
      : warnings.length
        ? "WARNING"
        : "ELIGIBLE",
    reasons: [...blocked, ...warnings],
    riskFlags: [...new Set(riskFlags)]
  };
}
