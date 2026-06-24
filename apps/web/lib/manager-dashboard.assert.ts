import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildManagerDashboard } from "@/lib/manager-dashboard";

const managerPage = readFileSync("app/app/manager/page.tsx", "utf8");
const actions = readFileSync("app/app/actions.ts", "utf8");
assert.equal(managerPage.includes("ICU operations"), false);
assert.equal(managerPage.includes("unitId=unit_icu"), false);
assert.ok(managerPage.includes("context.activeSelection.unitId"));
assert.ok(actions.includes(
  'apiPostSession(`/shift-pipeline/slots/${slotId}/assign`'
));
import type { AuditLog, DemoShift, ShiftSwapRequest, StaffingGap } from "@/lib/api";

const shifts: DemoShift[] = [
  {
    id: "shift_open",
    unitId: "unit_icu",
    facilityId: "facility_main",
    title: "ICU Night",
    startsAt: "2026-06-05T23:00:00.000Z",
    endsAt: "2026-06-06T07:00:00.000Z",
    status: "OPEN"
  }
];

const gaps: StaffingGap[] = [
  {
    id: "gap_1",
    unitId: "unit_icu",
    role: "RN",
    requiredCount: 2,
    assignedCount: 1,
    gapCount: 1,
    severity: "HIGH",
    recommendedActions: ["Offer open shift"]
  }
];

const swaps: ShiftSwapRequest[] = [
  {
    id: "swap_1",
    organizationId: "org_pulseshift_demo",
    originalSlotId: "slot_1",
    requesterEmployeeId: "emp_priya",
    requesterUserId: "user_priya",
    proposedEmployeeId: "emp_maya",
    proposedUserId: "user_maya",
    unitId: "unit_icu",
    status: "PENDING_MANAGER",
    policyDecision: {
      allowed: true,
      requiresApproval: true,
      riskFlags: ["OVERTIME_RISK"],
      blockingReasons: [],
      warnings: [],
      evaluatedAt: "2026-06-07T12:00:00.000Z"
    },
    managerApprovalRequired: true,
    approvalRequestId: "approval_swap_1",
    createdAt: "2026-06-07T12:01:00.000Z"
  }
];

const auditLogs: AuditLog[] = [
  {
    id: "audit_1",
    actorType: "USER",
    action: "FIRST",
    objectType: "Shift",
    objectId: "shift_1",
    createdAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "audit_2",
    actorType: "USER",
    action: "SECOND",
    objectType: "Shift",
    objectId: "shift_2",
    createdAt: "2026-06-02T00:00:00.000Z"
  }
];

const dashboard = buildManagerDashboard({ shifts, gaps, swaps, auditLogs });

assert.equal(dashboard.priorityGap?.id, "gap_1");
assert.equal(dashboard.pendingSwaps.length, 1);
assert.equal(dashboard.cards.at(0)?.tone, "attention");
assert.equal(dashboard.cards.at(1)?.value, "1");
assert.equal(dashboard.cards.at(2)?.detail, "ICU Night");
assert.equal(dashboard.cards.at(3)?.detail, "OVERTIME RISK");
assert.equal(dashboard.recentAuditLogs.at(0)?.id, "audit_2");

const pipelineDashboard = buildManagerDashboard({
  shifts,
  gaps,
  swaps: [],
  auditLogs,
  slots: [
    {
      id: "slot_1",
      organizationId: "org_pulseshift_demo",
      facilityId: "fac_mercy_main",
      unitId: "unit_icu",
      roleRequiredId: "role_rn",
      certificationRequiredIds: ["cert_bls"],
      startsAt: "2026-06-20T23:00:00.000Z",
      endsAt: "2026-06-21T11:00:00.000Z",
      status: "OPEN",
      source: "TEMPLATE",
      riskFlags: ["STAFFING_GAP"]
    }
  ],
  claims: [
    {
      id: "claim_1",
      organizationId: "org_pulseshift_demo",
      slotId: "slot_1",
      employeeId: "emp_priya",
      userId: "user_priya",
      status: "PENDING_APPROVAL",
      policyDecision: {
        allowed: true,
        requiresApproval: true,
        riskFlags: ["OVERTIME_RISK"],
        blockingReasons: [],
        warnings: [],
        evaluatedAt: "2026-06-07T12:00:00.000Z"
      },
      createdAt: "2026-06-07T12:01:00.000Z"
    }
  ],
  approvals: [
    {
      id: "approval_1",
      approvalType: "SHIFT_ASSIGNMENT",
      requestedByUserId: "user_priya",
      approverUserId: "user_jordan_manager",
      targetObjectType: "ShiftSlot",
      targetObjectId: "slot_1",
      status: "PENDING",
      riskFlags: ["OVERTIME_RISK"]
    }
  ]
});

assert.equal(pipelineDashboard.pendingClaims.length, 1);
assert.equal(pipelineDashboard.openSlots.length, 1);
assert.equal(pipelineDashboard.approvals.length, 1);
assert.equal(pipelineDashboard.cards.at(1)?.value, "1");
assert.equal(pipelineDashboard.cards.at(1)?.detail, "Shift claims need review");
