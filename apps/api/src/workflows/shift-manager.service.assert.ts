import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";

import { demoSessions } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { demoApprovals } from "../demo/demo-data";
import { demoShiftClaims } from "./shift-pipeline.repository";
import { ShiftClaimService } from "./shift-claim.service";
import { ShiftEligibilityService } from "./shift-eligibility.service";
import { ShiftManagerService } from "./shift-manager.service";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";
import { seedDemoShiftPipelineState } from "./shift-pipeline.seed";

function session(userId: string) {
  const found = demoSessions.find((candidate) => candidate.userId === userId);
  assert.ok(found);
  return found;
}

function services() {
  const permissions = new PermissionService();
  const eligibility = new ShiftEligibilityService();
  const repositories = new ShiftPipelineRepositoryProvider();
  return {
    claims: new ShiftClaimService(permissions, eligibility, repositories),
    manager: new ShiftManagerService(permissions, eligibility, repositories)
  };
}

async function run() {
  seedDemoShiftPipelineState();
  demoApprovals.splice(0);
  demoShiftClaims.splice(0);

  const approvalServices = services();
  const pending = await approvalServices.claims.claimOpenSlot(session("user_priya"), "slot_shift_open_icu_night");
  const approved = await approvalServices.manager.decidePendingClaim(
    session("user_jordan_manager"),
    pending.claim.id,
    "approve",
    "Approved for urgent ICU coverage"
  );
  assert.equal(approved.status, "ASSIGNED");
  assert.equal(approved.approval.status, "APPROVED");
  assert.equal(approved.claim.status, "ASSIGNED");
  assert.equal(approved.assignment.employeeId, "emp_priya");

  seedDemoShiftPipelineState();
  demoApprovals.splice(0);
  demoShiftClaims.splice(0);

  const denialServices = services();
  const pendingForDenial = await denialServices.claims.claimOpenSlot(session("user_priya"), "slot_shift_open_icu_night");
  const denied = await denialServices.manager.decidePendingClaim(
    session("user_jordan_manager"),
    pendingForDenial.claim.id,
    "deny",
    "Denied to preserve overtime budget"
  );
  assert.equal(denied.status, "DENIED");
  assert.equal(denied.approval.status, "DENIED");
  assert.equal(denied.claim.status, "DENIED");

  seedDemoShiftPipelineState();
  demoApprovals.splice(0);
  demoShiftClaims.splice(0);

  const directServices = services();
  const directAssignment = await directServices.manager.directAssignSlot(
    session("user_jordan_manager"),
    "slot_shift_open_icu_week3",
    "user_maya"
  );
  assert.equal(directAssignment.status, "ASSIGNED");
  assert.equal(directAssignment.assignment.employeeId, "emp_maya");
  assert.equal(directAssignment.slot.status, "ASSIGNED");

  await assert.rejects(
    () =>
      directServices.manager.directAssignSlot(
        session("user_jordan_manager"),
        "slot_shift_open_ed_day_week2",
        "user_aria_agency"
      ),
    BadRequestException
  );
}

void run();
