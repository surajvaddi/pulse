import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";

import { demoSessions } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { demoShiftSlots, ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";
import { ShiftCreationService } from "./shift-creation.service";

function session(userId: string) {
  const found = demoSessions.find((candidate) => candidate.userId === userId);
  assert.ok(found);
  return found;
}

async function run() {
  seedDemoShiftPipelineState();
  const initialCount = demoShiftSlots.length;
  const service = new ShiftCreationService(new PermissionService(), new ShiftPipelineRepositoryProvider());

  const draft = await service.createDraftSlot(session("user_wendy_workforce"), {
    facilityId: "fac_mercy_main",
    unitId: "unit_icu",
    roleRequiredId: "role_rn",
    certificationRequiredIds: ["cert_bls", "cert_acls"],
    startsAt: "2026-06-22T11:00:00.000Z",
    endsAt: "2026-06-22T23:00:00.000Z"
  });
  assert.equal(draft.status, "DRAFT");
  assert.equal(demoShiftSlots.length, initialCount + 1);

  const requirementSlots = await service.createSlotsFromRequirement(session("user_wendy_workforce"), {
    id: "requirement_assertion_icu_day",
    organizationId: "org_pulseshift_demo",
    facilityId: "fac_mercy_main",
    unitId: "unit_icu",
    roleId: "role_rn",
    certificationRequiredIds: ["cert_bls"],
    startAt: "2026-06-23T11:00:00.000Z",
    endAt: "2026-06-23T23:00:00.000Z",
    minRequired: 2,
    idealRequired: 3,
    source: "TEMPLATE"
  });
  assert.equal(requirementSlots.length, 3);
  assert.ok(requirementSlots.every((slot) => slot.status === "DRAFT"));

  await assert.rejects(
    () =>
      service.createDraftSlot(session("user_priya"), {
        facilityId: "fac_mercy_main",
        unitId: "unit_icu",
        roleRequiredId: "role_rn",
        certificationRequiredIds: ["cert_bls"],
        startsAt: "2026-06-24T11:00:00.000Z",
        endsAt: "2026-06-24T23:00:00.000Z"
      }),
    ForbiddenException
  );
}

void run();
