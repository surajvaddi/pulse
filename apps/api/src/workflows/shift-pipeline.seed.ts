import type {
  ShiftAssignmentContract,
  ShiftClaimRequestContract,
  ShiftPolicyDecisionSnapshot,
  ShiftSlotContract,
  ShiftSlotStatus
} from "@pulseshift/domain";

import { demoSchedules, type DemoShiftRecord } from "../demo/demo-data";
import { demoShiftAssignments, demoShiftClaims, demoShiftSlots } from "./shift-pipeline.repository";

const ORGANIZATION_ID = "org_pulseshift_demo";
const DEFAULT_MANAGER_USER_ID = "user_jordan_manager";
const SEEDED_AT = "2026-06-07T12:00:00.000Z";

function certificationIdsForShift(shift: DemoShiftRecord) {
  const certifications = ["cert_bls"];
  if (shift.title.includes("ICU")) {
    certifications.push("cert_acls", "cert_icu_qualified");
  }
  if (shift.title.includes("Charge")) {
    certifications.push("cert_charge_authorization");
  }
  if (shift.title.includes("Agency")) {
    certifications.push("cert_agency_contract");
  }
  return certifications;
}

function roleIdForShift(shift: DemoShiftRecord) {
  if (shift.title.includes("Charge")) {
    return "role_charge_rn";
  }
  if (shift.title.includes("Agency")) {
    return "role_agency_rn";
  }
  return "role_rn";
}

function slotStatusForShift(shift: DemoShiftRecord): ShiftSlotStatus {
  if (shift.status === "ASSIGNED") {
    return "ASSIGNED";
  }
  if (shift.status === "PUBLISHED") {
    return "PUBLISHED";
  }
  return "OPEN";
}

function slotForShift(shift: DemoShiftRecord): ShiftSlotContract {
  return {
    id: `slot_${shift.id}`,
    organizationId: ORGANIZATION_ID,
    facilityId: shift.facilityId,
    unitId: shift.unitId,
    requirementId: `requirement_${shift.unitId}_${shift.startsAt.slice(0, 10)}`,
    roleRequiredId: roleIdForShift(shift),
    certificationRequiredIds: certificationIdsForShift(shift),
    startsAt: shift.startsAt,
    endsAt: shift.endsAt,
    status: slotStatusForShift(shift),
    source: "TEMPLATE",
    riskFlags: shift.riskFlags ?? []
  };
}

function assignmentForShift(shift: DemoShiftRecord): ShiftAssignmentContract | null {
  if (!shift.employeeId) {
    return null;
  }
  return {
    id: `assignment_${shift.id}`,
    organizationId: ORGANIZATION_ID,
    slotId: `slot_${shift.id}`,
    employeeId: shift.employeeId,
    assignedByUserId: shift.userId ? "system_schedule_import" : DEFAULT_MANAGER_USER_ID,
    status: "ACTIVE",
    source: shift.status === "PUBLISHED" ? "IMPORT" : "MANAGER_ASSIGNMENT",
    createdAt: SEEDED_AT
  };
}

function decision(input: {
  allowed: boolean;
  requiresApproval: boolean;
  riskFlags?: string[];
  blockingReasons?: string[];
  warnings?: string[];
}): ShiftPolicyDecisionSnapshot {
  return {
    allowed: input.allowed,
    requiresApproval: input.requiresApproval,
    riskFlags: input.riskFlags ?? [],
    blockingReasons: input.blockingReasons ?? [],
    warnings: input.warnings ?? [],
    evaluatedAt: SEEDED_AT
  };
}

function seededClaims(): ShiftClaimRequestContract[] {
  return [
    {
      id: "claim_open_icu_night_priya_pending",
      organizationId: ORGANIZATION_ID,
      slotId: "slot_shift_open_icu_night",
      employeeId: "emp_priya",
      userId: "user_priya",
      status: "PENDING_APPROVAL",
      approvalRequestId: "approval_claim_open_icu_night_priya",
      policyDecision: decision({
        allowed: true,
        requiresApproval: true,
        riskFlags: ["OVERTIME_RISK", "STAFFING_GAP"],
        warnings: ["Manager approval required because the claim creates projected overtime."]
      }),
      createdAt: "2026-06-07T12:05:00.000Z",
      expiresAt: "2026-06-08T12:05:00.000Z"
    },
    {
      id: "claim_open_ed_day_aria_denied",
      organizationId: ORGANIZATION_ID,
      slotId: "slot_shift_open_ed_day_week2",
      employeeId: "emp_aria",
      userId: "user_aria_agency",
      status: "DENIED",
      policyDecision: decision({
        allowed: false,
        requiresApproval: false,
        riskFlags: ["UNIT_SCOPE_MISMATCH", "REST_PERIOD_RISK"],
        blockingReasons: ["Agency employee is not credentialed for ED day coverage in this sandbox."]
      }),
      createdAt: "2026-06-07T12:08:00.000Z",
      decidedAt: "2026-06-07T12:09:00.000Z"
    },
    {
      id: "claim_open_icu_week3_maya_submitted",
      organizationId: ORGANIZATION_ID,
      slotId: "slot_shift_open_icu_week3",
      employeeId: "emp_maya",
      userId: "user_maya",
      status: "SUBMITTED",
      policyDecision: decision({
        allowed: true,
        requiresApproval: false,
        riskFlags: ["STAFFING_GAP"],
        warnings: ["Claim is eligible and waiting for lifecycle processing."]
      }),
      createdAt: "2026-06-07T12:10:00.000Z",
      expiresAt: "2026-06-09T12:10:00.000Z"
    },
    {
      id: "claim_assigned_priya_week2",
      organizationId: ORGANIZATION_ID,
      slotId: "slot_shift_priya_week2_icu_day",
      employeeId: "emp_priya",
      userId: "user_priya",
      status: "ASSIGNED",
      assignmentId: "assignment_shift_priya_week2_icu_day",
      policyDecision: decision({
        allowed: true,
        requiresApproval: false
      }),
      createdAt: "2026-06-06T16:00:00.000Z",
      decidedAt: "2026-06-06T16:02:00.000Z"
    }
  ];
}

export function seedDemoShiftPipelineState() {
  demoShiftSlots.splice(0, demoShiftSlots.length, ...demoSchedules.map(slotForShift));
  demoShiftAssignments.splice(
    0,
    demoShiftAssignments.length,
    ...demoSchedules.map(assignmentForShift).filter((assignment): assignment is ShiftAssignmentContract => Boolean(assignment))
  );
  demoShiftClaims.splice(0, demoShiftClaims.length, ...seededClaims());
}

export function resetDemoShiftPipelineState() {
  seedDemoShiftPipelineState();
}
