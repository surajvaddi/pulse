import assert from "node:assert/strict";

import { buildOpenShiftCards } from "@/lib/shift-pipeline-view";

const cards = buildOpenShiftCards(
  [
    {
      id: "slot_1",
      organizationId: "org_pulseshift_demo",
      facilityId: "fac_mercy_main",
      unitId: "unit_icu",
      roleRequiredId: "role_rn",
      certificationRequiredIds: ["cert_bls", "cert_acls"],
      startsAt: "2026-06-20T23:00:00.000Z",
      endsAt: "2026-06-21T11:00:00.000Z",
      status: "OPEN",
      source: "TEMPLATE",
      riskFlags: ["STAFFING_GAP"]
    },
    {
      id: "slot_2",
      organizationId: "org_pulseshift_demo",
      facilityId: "fac_mercy_main",
      unitId: "unit_ed",
      roleRequiredId: "role_rn",
      certificationRequiredIds: ["cert_bls"],
      startsAt: "2026-06-12T11:00:00.000Z",
      endsAt: "2026-06-12T23:00:00.000Z",
      status: "CLAIM_PENDING",
      source: "TEMPLATE",
      riskFlags: ["REST_PERIOD_RISK"]
    }
  ],
  [
    {
      id: "claim_2",
      organizationId: "org_pulseshift_demo",
      slotId: "slot_2",
      employeeId: "emp_priya",
      userId: "user_priya",
      status: "PENDING_APPROVAL",
      policyDecision: {
        allowed: true,
        requiresApproval: true,
        riskFlags: ["REST_PERIOD_RISK"],
        blockingReasons: [],
        warnings: [],
        evaluatedAt: "2026-06-07T12:00:00.000Z"
      },
      createdAt: "2026-06-07T12:00:00.000Z"
    }
  ]
);

assert.equal(cards[0]?.id, "slot_2");
assert.equal(cards[0]?.statusTone, "pending");
assert.equal(cards[0]?.canClaim, false);
assert.equal(cards[0]?.claimButtonLabel, "Claim pending");
assert.equal(cards[1]?.unitLabel, "ICU");
assert.equal(cards[1]?.roleLabel, "RN");
assert.equal(cards[1]?.certificationLabel, "BLS, ACLS");
assert.equal(cards[1]?.riskLabel, "STAFFING GAP");
assert.equal(cards[1]?.canClaim, true);
