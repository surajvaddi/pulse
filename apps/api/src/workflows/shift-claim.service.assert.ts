import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";

import { PermissionService } from "../auth/permission.service";
import { demoSessions } from "../auth/demo-users";
import { demoApprovals } from "../demo/demo-data";
import { demoShiftClaims } from "./shift-pipeline.repository";
import { ShiftEligibilityService } from "./shift-eligibility.service";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";
import { ShiftClaimService } from "./shift-claim.service";

function session(userId: string) {
  const found = demoSessions.find((candidate) => candidate.userId === userId);
  assert.ok(found);
  return found;
}

function buildService() {
  return new ShiftClaimService(
    new PermissionService(),
    new ShiftEligibilityService(),
    new ShiftPipelineRepositoryProvider()
  );
}

async function run() {
  seedDemoShiftPipelineState();
  demoApprovals.splice(0);
  demoShiftClaims.splice(0);

  const service = buildService();

  const mayaClaim = await service.claimOpenSlot(session("user_maya"), "slot_shift_open_icu_week3");
  assert.equal(mayaClaim.status, "ASSIGNED");
  assert.equal(mayaClaim.claim.status, "ASSIGNED");
  assert.equal(mayaClaim.slot.status, "ASSIGNED");
  assert.equal(mayaClaim.assignment.employeeId, "emp_maya");

  await assert.rejects(
    () => service.claimOpenSlot(session("user_maya"), "slot_shift_open_icu_week3"),
    BadRequestException
  );

  const priyaClaim = await service.claimOpenSlot(session("user_priya"), "slot_shift_open_icu_night");
  assert.equal(priyaClaim.status, "PENDING_APPROVAL");
  assert.equal(priyaClaim.claim.status, "PENDING_APPROVAL");
  assert.equal(priyaClaim.slot.status, "CLAIM_PENDING");
  assert.equal(priyaClaim.approval.status, "PENDING");
  assert.equal(demoApprovals.length, 1);

  const cancelled = await service.cancelClaim(session("user_priya"), priyaClaim.claim.id);
  assert.equal(cancelled.status, "CANCELLED");

  await assert.rejects(
    () => service.claimOpenSlot(session("user_aria_agency"), "slot_shift_open_ed_day_week2"),
    BadRequestException
  );
}

void run();
