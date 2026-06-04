import assert from "node:assert/strict";

import { buildManagerDashboard } from "@/lib/manager-dashboard";
import type { AuditLog, DemoShift, DemoSwap, StaffingGap } from "@/lib/api";

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

const swaps: DemoSwap[] = [
  {
    id: "swap_1",
    requesterUserId: "user_priya",
    proposedUserId: "user_maya",
    originalShiftId: "shift_1",
    unitId: "unit_icu",
    status: "PENDING_MANAGER",
    riskFlags: ["OVERTIME_RISK"],
    timeline: ["Created", "Accepted"]
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
