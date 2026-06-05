import "reflect-metadata";

import { strict as assert } from "node:assert";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../app.module";
import {
  AdminAuditReasonSchema,
  InvitationMutationSchema,
  RoleAssignmentSchema,
  UserStatusMutationSchema,
  assertAdminContractsSafe
} from "../admin/admin-contracts";
import { FacilityAdminService } from "../admin/facility.service";
import { InvitationAdminService } from "../admin/invitation-admin.service";
import { OrganizationAdminService } from "../admin/organization.service";
import { RoleAdminService } from "../admin/role.service";
import { UnitAdminService } from "../admin/unit.service";
import { UserAdminService } from "../admin/user.service";
import {
  assertRolePageMatrixComplete,
  productionPages,
  productionRoles,
  rolePageMatrix
} from "../admin/role-page-matrix";
import { adminAuditEvents } from "../admin/admin-state";
import { resetDemoWorkflowState } from "../demo/demo-data";
import {
  assertSqlReportRegistrySafe,
  getSqlReportDefinition,
  listSqlReports,
  sqlReportRegistry
} from "../workflows/sql-report.registry";

async function main() {
  resetDemoWorkflowState();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  const server = app.getHttpServer();

  assert.equal(assertRolePageMatrixComplete(), true);
  assert.equal(Object.keys(rolePageMatrix).length, productionRoles.length);
  assert.equal(Object.keys(rolePageMatrix.EMPLOYEE).length, productionPages.length);
  assert.deepEqual(rolePageMatrix.EMPLOYEE.timecards.visibleActions, ["clock_in", "clock_out"]);
  assert.ok(rolePageMatrix.SYSTEM_ADMIN.admin_users.hiddenActions.includes("raw_permission_entry"));
  assert.equal(assertAdminContractsSafe(), true);
  assert.deepEqual(AdminAuditReasonSchema.parse({ reason: "Required production audit reason" }), {
    reason: "Required production audit reason"
  });
  assert.equal(UserStatusMutationSchema.parse({ status: "SUSPENDED", reason: "Policy review" }).status, "SUSPENDED");
  assert.throws(() => RoleAssignmentSchema.parse({ userId: "user", role: "EMPLOYEE", permissions: [] }));
  assert.throws(() => InvitationMutationSchema.parse({ email: "bad", role: "EMPLOYEE", scope: { type: "SELF" }, reason: "Invite" }));
  const organizationAdmin = new OrganizationAdminService();
  const organizationSummary = await organizationAdmin.getSummary("org_pulseshift_demo");
  assert.equal(organizationSummary.name, "PulseShift Demo Health");
  const renamedOrganization = await organizationAdmin.updateSettings("org_pulseshift_demo", {
    name: "PulseShift Demo Health System",
    reason: "Testing organization settings update"
  });
  assert.equal(renamedOrganization.name, "PulseShift Demo Health System");
  assert.rejects(() => organizationAdmin.getSummary("org_unknown"));
  const facilityAdmin = new FacilityAdminService();
  const initialFacilities = await facilityAdmin.list("org_pulseshift_demo");
  assert.ok(initialFacilities.some((facility) => facility.id === "fac_mercy_main"));
  const createdFacility = await facilityAdmin.create("org_pulseshift_demo", {
    name: "North Campus",
    timezone: "America/New_York",
    reason: "Testing facility creation"
  });
  assert.equal(createdFacility.status, "ACTIVE");
  const updatedFacility = await facilityAdmin.update("org_pulseshift_demo", createdFacility.id, {
    name: "North Campus Hospital",
    timezone: "America/Chicago",
    reason: "Testing facility update"
  });
  assert.equal(updatedFacility.timezone, "America/Chicago");
  const deactivatedFacility = await facilityAdmin.deactivate(
    "org_pulseshift_demo",
    createdFacility.id,
    "Testing facility deactivate"
  );
  assert.equal(deactivatedFacility.status, "INACTIVE");
  assert.rejects(() => facilityAdmin.update("org_other", createdFacility.id, {
    name: "Cross Org",
    timezone: "America/New_York",
    reason: "Cross org denial"
  }));
  const unitAdmin = new UnitAdminService();
  const initialUnits = await unitAdmin.list("org_pulseshift_demo", "fac_mercy_main");
  assert.ok(initialUnits.some((unit) => unit.id === "unit_icu"));
  const createdUnit = await unitAdmin.create("org_pulseshift_demo", {
    facilityId: "fac_mercy_main",
    name: "Pediatric ICU",
    type: "PEDIATRICS",
    managerUserIds: ["user_jordan_manager"],
    reason: "Testing unit creation"
  });
  assert.equal(createdUnit.active, true);
  const reassignedUnit = await unitAdmin.assignManagers(
    "org_pulseshift_demo",
    createdUnit.id,
    ["user_admin", "user_jordan_manager"],
    "Testing manager assignment"
  );
  assert.equal(reassignedUnit.managerUserIds.length, 2);
  const updatedUnit = await unitAdmin.update("org_pulseshift_demo", createdUnit.id, {
    facilityId: "fac_mercy_main",
    name: "Pediatric ICU East",
    type: "PEDIATRICS",
    managerUserIds: ["user_admin"],
    reason: "Testing unit update"
  });
  assert.equal(updatedUnit.name, "Pediatric ICU East");
  const deactivatedUnit = await unitAdmin.deactivate(
    "org_pulseshift_demo",
    createdUnit.id,
    "Testing unit deactivate"
  );
  assert.equal(deactivatedUnit.active, false);
  assert.rejects(() => unitAdmin.assignManagers("org_other", createdUnit.id, [], "Cross org denial"));
  const userAdmin = new UserAdminService();
  const adminUsers = await userAdmin.list("org_pulseshift_demo");
  assert.ok(adminUsers.some((user) => user.id === "user_priya"));
  const userDetail = await userAdmin.detail("org_pulseshift_demo", "user_priya");
  assert.equal(userDetail.email, "priya.nurse@example.com");
  const suspendedUser = await userAdmin.updateStatus("org_pulseshift_demo", "user_priya", {
    status: "SUSPENDED",
    reason: "Testing suspension blocks protected access"
  });
  assert.equal(suspendedUser.status, "SUSPENDED");
  await request(server)
    .get("/demo/schedule/me")
    .set("x-demo-user-id", "user_priya")
    .expect(401);
  const reactivatedUser = await userAdmin.updateStatus("org_pulseshift_demo", "user_priya", {
    status: "ACTIVE",
    reason: "Testing reactivation"
  });
  assert.equal(reactivatedUser.status, "ACTIVE");
  assert.rejects(() => userAdmin.detail("org_other", "user_priya"));
  const roleAdmin = new RoleAdminService();
  const assignedRole = await roleAdmin.assignRole("org_pulseshift_demo", {
    userId: "user_priya",
    role: "UNIT_MANAGER",
    scope: { type: "UNIT", unitIds: ["unit_icu"] },
    reason: "Testing controlled role assignment"
  });
  assert.equal(assignedRole.role, "UNIT_MANAGER");
  assert.ok(assignedRole.permissions.includes("schedule:read:unit"));
  assert.equal(assignedRole.permissions.includes("audit:read"), false);
  const scopedRole = await roleAdmin.updateScope("org_pulseshift_demo", {
    userId: "user_priya",
    role: "UNIT_MANAGER",
    scope: { type: "UNIT", unitIds: ["unit_ed"] },
    reason: "Testing controlled scope update"
  });
  assert.deepEqual(scopedRole.scope, { type: "UNIT", unitIds: ["unit_ed"] });
  await roleAdmin.removeRole("org_pulseshift_demo", "user_priya", "UNIT_MANAGER", "Testing role removal");
  const priyaAfterRoleRemoval = await userAdmin.detail("org_pulseshift_demo", "user_priya");
  assert.equal(priyaAfterRoleRemoval.roles.includes("UNIT_MANAGER"), false);
  assert.throws(() => RoleAssignmentSchema.parse({
    userId: "user_priya",
    role: "UNIT_MANAGER",
    scope: { type: "UNIT", unitIds: ["unit_icu"] },
    permissions: ["audit:read"],
    reason: "Arbitrary permission attempt"
  }));
  const invitationAdmin = new InvitationAdminService();
  const adminInvitation = await invitationAdmin.create("org_pulseshift_demo", "user_admin", {
    email: "new.unit.manager@example.com",
    role: "UNIT_MANAGER",
    scope: { type: "UNIT", unitIds: ["unit_icu"] },
    reason: "Testing admin invitation"
  });
  assert.equal(adminInvitation.status, "PENDING");
  const adminInvitations = await invitationAdmin.list("org_pulseshift_demo");
  assert.ok(adminInvitations.some((invitation) => invitation.id === adminInvitation.id));
  const resentInvitation = await invitationAdmin.resendMetadata(
    "org_pulseshift_demo",
    adminInvitation.id,
    "Testing invite resend"
  );
  assert.equal(resentInvitation.status, "PENDING");
  const revokedInvitation = await invitationAdmin.revoke(
    "org_pulseshift_demo",
    adminInvitation.id,
    "Testing invite revoke"
  );
  assert.equal(revokedInvitation.status, "REVOKED");
  assert.rejects(() => invitationAdmin.revoke("org_other", adminInvitation.id, "Cross org denial"));

  const orgAdminApi = await request(server)
    .get("/admin/organization")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(orgAdminApi.body.id, "org_pulseshift_demo");
  await request(server)
    .get("/admin/organization")
    .set("x-demo-user-id", "user_priya")
    .expect(403);
  const adminFacilityApi = await request(server)
    .post("/admin/facilities")
    .set("x-demo-user-id", "user_admin")
    .send({
      name: "South Campus",
      timezone: "America/New_York",
      reason: "API facility test"
    })
    .expect(201);
  assert.equal(adminFacilityApi.body.status, "ACTIVE");
  const adminUnitApi = await request(server)
    .post("/admin/units")
    .set("x-demo-user-id", "user_admin")
    .send({
      facilityId: adminFacilityApi.body.id,
      name: "Observation",
      type: "OTHER",
      managerUserIds: ["user_jordan_manager"],
      reason: "API unit test"
    })
    .expect(201);
  assert.equal(adminUnitApi.body.managerUserIds[0], "user_jordan_manager");
  const adminRoleApi = await request(server)
    .post("/admin/roles")
    .set("x-demo-user-id", "user_admin")
    .send({
      userId: "user_priya",
      role: "UNIT_MANAGER",
      scope: { type: "UNIT", unitIds: ["unit_icu"] },
      reason: "API role test"
    })
    .expect(201);
  assert.ok(adminRoleApi.body.permissions.includes("schedule:read:unit"));
  const adminInvitationApi = await request(server)
    .post("/admin/invitations")
    .set("x-demo-user-id", "user_admin")
    .send({
      email: "api.invite@example.com",
      role: "EMPLOYEE",
      scope: { type: "SELF" },
      reason: "API invite test"
    })
    .expect(201);
  assert.equal(adminInvitationApi.body.status, "PENDING");
  const adminAuditActions = adminAuditEvents.map((event) => event.action);
  assert.ok(adminAuditActions.includes("admin.organization.updated"));
  assert.ok(adminAuditActions.includes("admin.facility.created"));
  assert.ok(adminAuditActions.includes("admin.unit.managers_assigned"));
  assert.ok(adminAuditActions.includes("admin.user.suspended"));
  assert.ok(adminAuditActions.includes("admin.user.active"));
  assert.ok(adminAuditActions.includes("admin.role.assigned"));
  assert.ok(adminAuditActions.includes("admin.role.removed"));
  assert.ok(adminAuditActions.includes("admin.invitation.created"));
  assert.ok(adminAuditActions.includes("admin.invitation.revoked"));

  assert.deepEqual(listSqlReports(), [
    "get_staffing_gaps_report",
    "get_employee_schedule_report",
    "get_timecard_exceptions_report",
    "get_credential_expiry_report",
    "get_audit_activity_report"
  ]);
  assert.equal(assertSqlReportRegistrySafe(), true);
  assert.ok(sqlReportRegistry.every((report) => report.maxRows <= 250));
  assert.ok(sqlReportRegistry.every((report) => report.timeoutMs <= 1500));
  const staffingReport = getSqlReportDefinition("get_staffing_gaps_report");
  assert.equal(staffingReport?.requiredPermission, "schedule:read:unit");
  assert.equal(staffingReport?.maxRows, 100);
  assert.deepEqual(staffingReport?.validateParams({ unitId: "unit_icu" }), { unitId: "unit_icu" });
  assert.throws(() => staffingReport?.validateParams({ rawSql: "select * from shifts" }));
  const scheduleReport = getSqlReportDefinition("get_employee_schedule_report");
  assert.equal(scheduleReport?.requiredPermission, "schedule:read:self");
  assert.deepEqual(scheduleReport?.validateParams({
    userId: "user_priya",
    startsAt: "2026-05-28T00:00:00.000Z",
    endsAt: "2026-06-02T00:00:00.000Z"
  }), {
    userId: "user_priya",
    startsAt: "2026-05-28T00:00:00.000Z",
    endsAt: "2026-06-02T00:00:00.000Z"
  });
  assert.throws(() => scheduleReport?.validateParams({ query: "select * from employee_profiles" }));
  const timecardReport = getSqlReportDefinition("get_timecard_exceptions_report");
  assert.equal(timecardReport?.requiredPermission, "timecard:read:unit");
  assert.deepEqual(timecardReport?.validateParams({
    unitId: "unit_icu",
    status: "OPEN"
  }), {
    unitId: "unit_icu",
    status: "OPEN"
  });
  assert.throws(() => timecardReport?.validateParams({ sql: "select * from timecard_exceptions" }));
  const credentialReport = getSqlReportDefinition("get_credential_expiry_report");
  assert.equal(credentialReport?.requiredPermission, "credential:read");
  assert.deepEqual(credentialReport?.validateParams({
    unitId: "unit_icu",
    expiresBefore: "2026-07-01T00:00:00.000Z"
  }), {
    unitId: "unit_icu",
    expiresBefore: "2026-07-01T00:00:00.000Z"
  });
  assert.throws(() => credentialReport?.validateParams({ rawQuery: "select * from certifications" }));
  const auditReport = getSqlReportDefinition("get_audit_activity_report");
  assert.equal(auditReport?.requiredPermission, "audit:read");
  assert.deepEqual(auditReport?.validateParams({
    actorUserId: "user_admin",
    action: "integration.sync_completed"
  }), {
    actorUserId: "user_admin",
    action: "integration.sync_completed"
  });
  assert.throws(() => auditReport?.validateParams({ statement: "select * from audit_logs" }));

  const demoUserIdsByRole = {
    ORGANIZATION_OWNER: "user_owner",
    SYSTEM_ADMIN: "user_admin",
    WORKFORCE_ADMIN: "user_wendy_workforce",
    UNIT_MANAGER: "user_jordan_manager",
    CHARGE_NURSE: "user_olivia_charge",
    EMPLOYEE: "user_priya",
    FLOAT_POOL_COORDINATOR: "user_felix_float",
    PAYROLL_ADMIN: "user_payroll",
    CREDENTIALING_ADMIN: "user_carmen_credentials",
    COMPLIANCE_AUDITOR: "user_avery_auditor",
    EXECUTIVE_VIEWER: "user_evan_exec",
    EXTERNAL_AGENCY_ADMIN: "user_aria_agency",
    AI_AGENT_SERVICE: "user_ai_service"
  } satisfies Record<(typeof productionRoles)[number], string>;

  for (const role of productionRoles) {
    const sessionResponse = await request(server)
      .get("/auth/me")
      .set("x-demo-user-id", demoUserIdsByRole[role])
      .expect(200);
    assert.equal(sessionResponse.body.role, role);
    assert.ok(sessionResponse.body.permissions.length > 0);
  }

  const employeeSchedule = await request(server)
    .get("/demo/schedule/me")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.ok(employeeSchedule.body.length >= 2);
  assert.ok(employeeSchedule.body.some((shift: { id: string }) => shift.id === "shift_priya_friday_icu_night"));

  const employeeVisibleSchedule = await request(server)
    .get("/demo/schedule/visible")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.ok(employeeVisibleSchedule.body.every((shift: { userId?: string }) => shift.userId === "user_priya"));

  const chargeVisibleSchedule = await request(server)
    .get("/demo/schedule/visible")
    .set("x-demo-user-id", "user_olivia_charge")
    .expect(200);
  assert.ok(chargeVisibleSchedule.body.every((shift: { unitId: string }) => shift.unitId === "unit_icu"));

  const workforceVisibleSchedule = await request(server)
    .get("/demo/schedule/visible")
    .set("x-demo-user-id", "user_wendy_workforce")
    .expect(200);
  assert.ok(workforceVisibleSchedule.body.length >= chargeVisibleSchedule.body.length);

  await request(server)
    .get("/demo/schedule/visible")
    .set("x-demo-user-id", "user_payroll")
    .expect(403);

  await request(server)
    .get("/demo/schedule/unit/unit_icu")
    .set("x-demo-user-id", "user_priya")
    .expect(403);

  const employeeOpenShifts = await request(server)
    .get("/workflows/open-shifts")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.equal(employeeOpenShifts.body[0].id, "shift_open_icu_night");

  const managerUnitSchedule = await request(server)
    .get("/demo/schedule/unit/unit_icu")
    .set("x-demo-user-id", "user_jordan_manager")
    .expect(200);
  assert.ok(managerUnitSchedule.body.length >= 6);

  const payrollExceptions = await request(server)
    .get("/demo/timecards/exceptions")
    .set("x-demo-user-id", "user_payroll")
    .expect(200);
  assert.equal(payrollExceptions.body[0].id, "timecard_exception_late_priya");

  const initialClockStatus = await request(server)
    .get("/timeclock/status")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.equal(initialClockStatus.body.status, "CLOCKED_OUT");

  await request(server)
    .post("/timeclock/clock-in")
    .set("x-demo-user-id", "user_jordan_manager")
    .send({})
    .expect(403);

  const clockIn = await request(server)
    .post("/timeclock/clock-in")
    .set("x-demo-user-id", "user_priya")
    .send({ shiftId: "shift_priya_friday_icu_night", occurredAt: "2026-05-30T22:55:00.000Z" })
    .expect(201);
  assert.equal(clockIn.body.status, "CLOCKED_IN");
  assert.equal(clockIn.body.event.eventType, "CLOCK_IN");

  await request(server)
    .post("/timeclock/clock-in")
    .set("x-demo-user-id", "user_priya")
    .send({})
    .expect(400);

  const clockOut = await request(server)
    .post("/timeclock/clock-out")
    .set("x-demo-user-id", "user_priya")
    .send({ occurredAt: "2026-05-31T11:02:00.000Z" })
    .expect(201);
  assert.equal(clockOut.body.status, "CLOCKED_OUT");
  assert.equal(clockOut.body.event.eventType, "CLOCK_OUT");

  const timeclockEvents = await request(server)
    .get("/timeclock/events")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.ok(timeclockEvents.body.length >= 4);

  await request(server)
    .post("/users/invite")
    .set("x-demo-user-id", "user_payroll")
    .send({ email: "new.rn@example.com" })
    .expect(403);

  const invite = await request(server)
    .post("/users/invite")
    .set("x-demo-user-id", "user_admin")
    .send({
      email: "new.rn@example.com",
      role: "EMPLOYEE",
      scope: { type: "SELF" }
    })
    .expect(201);
  assert.equal(invite.body.email, "new.rn@example.com");
  assert.equal(invite.body.status, "PENDING");
  assert.equal(invite.body.tokenHash, undefined);
  assert.ok(invite.body.acceptUrl.includes("/invite/accept?token="));

  const pendingInvite = await request(server)
    .get(`/invitations/${invite.body.token}`)
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.equal(pendingInvite.body.email, "new.rn@example.com");

  const acceptedInvite = await request(server)
    .post(`/invitations/${invite.body.token}/accept`)
    .set("x-demo-user-id", "user_priya")
    .send({})
    .expect(201);
  assert.equal(acceptedInvite.body.status, "ACCEPTED");
  assert.equal(acceptedInvite.body.acceptedByUserId, "user_priya");
  assert.equal(acceptedInvite.body.nextStep, "/onboarding/profile");

  await request(server)
    .get(`/invitations/${invite.body.token}`)
    .set("x-demo-user-id", "user_priya")
    .expect(403);

  const logout = await request(server)
    .post("/auth/logout")
    .set("x-demo-user-id", "user_priya")
    .send({})
    .expect(201);
  assert.equal(logout.body.status, "SIGNED_OUT");

  process.env.ENABLE_DEMO_RESET = "false";
  await request(server)
    .post("/demo/reset")
    .set("x-demo-user-id", "user_admin")
    .send({})
    .expect(403);
  delete process.env.ENABLE_DEMO_RESET;
  process.env.APP_ENV = "production";
  await request(server)
    .post("/demo/reset")
    .set("x-demo-user-id", "user_admin")
    .send({})
    .expect(403);
  delete process.env.APP_ENV;

  await request(server)
    .get("/demo/audit")
    .set("x-demo-user-id", "user_payroll")
    .expect(403);

  const adminAudit = await request(server)
    .get("/demo/audit")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(adminAudit.body[0].id, "audit_seed_demo");

  const claimResult = await request(server)
    .post("/workflows/open-shifts/shift_open_icu_night/claim")
    .set("x-demo-user-id", "user_priya")
    .send({})
    .expect(201);
  assert.equal(claimResult.body.status, "PENDING_APPROVAL");
  assert.equal(claimResult.body.approval.approvalType, "SHIFT_ASSIGNMENT");
  assert.equal(claimResult.body.policyDecision.requiresApproval, true);
  assert.equal(claimResult.body.policyDecision.riskFlags[0], "OVERTIME_RISK");

  const swapCreate = await request(server)
    .post("/workflows/swaps")
    .set("x-demo-user-id", "user_priya")
    .send({ originalShiftId: "shift_priya_friday_icu_night", proposedUserId: "user_maya" })
    .expect(201);
  assert.equal(swapCreate.body.status, "PENDING_COUNTERPARTY");
  assert.equal(swapCreate.body.policyDecision.riskFlags[0], "MANAGER_APPROVAL_REQUIRED");

  await request(server)
    .post(`/workflows/swaps/${swapCreate.body.id}/approve`)
    .set("x-demo-user-id", "user_priya")
    .send({})
    .expect(403);

  const swapAccept = await request(server)
    .post(`/workflows/swaps/${swapCreate.body.id}/accept`)
    .set("x-demo-user-id", "user_maya")
    .send({})
    .expect(201);
  assert.equal(swapAccept.body.swap.status, "PENDING_MANAGER");
  assert.equal(swapAccept.body.approval.approvalType, "SHIFT_SWAP");

  const swapApprove = await request(server)
    .post(`/workflows/swaps/${swapCreate.body.id}/approve`)
    .set("x-demo-user-id", "user_jordan_manager")
    .send({ reason: "Coverage remains qualified" })
    .expect(201);
  assert.equal(swapApprove.body.swap.status, "APPROVED");
  assert.equal(swapApprove.body.shift.userId, "user_maya");
  assert.equal(swapApprove.body.policyDecision.allowed, true);

  const auditAfterWorkflow = await request(server)
    .get("/demo/audit")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  const auditActions = auditAfterWorkflow.body.map((log: { action: string }) => log.action);
  assert.ok(auditActions.includes("shift.claim.approval_requested"));
  assert.ok(auditActions.includes("swap.manager_approved"));
  assert.ok(auditActions.includes("notification.published"));
  assert.ok(auditActions.includes("timecard.clock_in"));
  assert.ok(auditActions.includes("timecard.clock_out"));

  const managerNotifications = await request(server)
    .get("/notifications")
    .set("x-demo-user-id", "user_jordan_manager")
    .expect(200);
  assert.ok(managerNotifications.body.length >= 1);
  assert.ok(
    managerNotifications.body.some(
      (notification: { type: string; category: string; priority: string }) =>
        notification.type === "APPROVAL_REQUIRED" &&
        notification.category === "APPROVAL" &&
        notification.priority === "URGENT"
    )
  );
  const managerNotificationSummary = await request(server)
    .get("/notifications/summary")
    .set("x-demo-user-id", "user_jordan_manager")
    .expect(200);
  assert.ok(managerNotificationSummary.body.unreadCount >= 1);
  assert.ok(managerNotificationSummary.body.recent.length <= 3);
  const firstNotificationId = managerNotifications.body[0].id;
  const readNotification = await request(server)
    .post(`/notifications/${firstNotificationId}/read`)
    .set("x-demo-user-id", "user_jordan_manager")
    .send({})
    .expect(201);
  assert.equal(readNotification.body.status, "READ");

  const employeePreferences = await request(server)
    .get("/notifications/preferences")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.ok(
    employeePreferences.body.some(
      (preference: { category: string; channel: string; required: boolean }) =>
        preference.category === "SCHEDULE" &&
        preference.channel === "IN_APP" &&
        preference.required === true
    )
  );

  const optionalPreferenceUpdate = await request(server)
    .post("/notifications/preferences")
    .set("x-demo-user-id", "user_priya")
    .send({ category: "SYSTEM", channel: "EMAIL", enabled: false })
    .expect(201);
  assert.equal(optionalPreferenceUpdate.body.enabled, false);

  await request(server)
    .post("/notifications/preferences")
    .set("x-demo-user-id", "user_priya")
    .send({ category: "SCHEDULE", channel: "IN_APP", enabled: false })
    .expect(400);

  await request(server)
    .post("/notifications/preferences")
    .set("x-demo-user-id", "user_priya")
    .send({ category: "STAFFING", channel: "SMS", enabled: true })
    .expect(403);

  await request(server)
    .post("/notifications/preferences")
    .set("x-demo-user-id", "user_ai_service")
    .send({ category: "SYSTEM", channel: "IN_APP", enabled: false })
    .expect(403);

  const scheduleAnswer = await request(server)
    .post("/copilot/messages")
    .set("x-demo-user-id", "user_priya")
    .send({ message: "When do I work next?" })
    .expect(201);
  assert.equal(scheduleAnswer.body.toolCalls[0].toolName, "get_my_schedule");

  const swapPreview = await request(server)
    .post("/copilot/messages")
    .set("x-demo-user-id", "user_priya")
    .send({ message: "Can I swap Friday night with Maya?" })
    .expect(201);
  assert.equal(swapPreview.body.mode, "ACTION_PREVIEW");

  const staffingAnswer = await request(server)
    .post("/copilot/messages")
    .set("x-demo-user-id", "user_jordan_manager")
    .send({ message: "Where are we short tomorrow night?" })
    .expect(201);
  assert.equal(staffingAnswer.body.toolCalls[0].toolName, "compute_staffing_gaps");

  const blockedAnswer = await request(server)
    .post("/copilot/messages")
    .set("x-demo-user-id", "user_priya")
    .send({ message: "Change my clock-in to 7 AM." })
    .expect(201);
  assert.equal(blockedAnswer.body.mode, "BLOCKED");
  assert.equal(blockedAnswer.body.toolCalls[0].status, "BLOCKED");

  const adminToolCalls = await request(server)
    .get("/copilot/tool-calls")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.ok(adminToolCalls.body.length >= 4);

  const staffingGaps = await request(server)
    .get("/operations/staffing/gaps")
    .set("x-demo-user-id", "user_jordan_manager")
    .expect(200);
  assert.equal(staffingGaps.body[0].id, "gap_icu_rn_night");
  assert.equal(staffingGaps.body[0].gapCount, 1);

  const candidates = await request(server)
    .get("/operations/staffing/gaps/gap_icu_rn_night/candidates")
    .set("x-demo-user-id", "user_jordan_manager")
    .expect(200);
  assert.ok(candidates.body.candidates.some((candidate: { name: string }) => candidate.name === "Nina Patel"));

  const credentialWarnings = await request(server)
    .get("/operations/credentials/warnings")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(credentialWarnings.body[0].employeeName, "Nina Patel");

  const employeeStaffView = await request(server)
    .get("/operations/staff")
    .set("x-demo-user-id", "user_priya")
    .expect(200);
  assert.equal(employeeStaffView.body[0].eligibility, "ICU qualified");
  assert.equal(employeeStaffView.body[0].certifications, undefined);

  const resolvedException = await request(server)
    .post("/operations/timecards/exceptions/timecard_exception_late_priya/resolve")
    .set("x-demo-user-id", "user_payroll")
    .send({ resolution: "Manager confirmed early unit need." })
    .expect(201);
  assert.equal(resolvedException.body.status, "RESOLVED");

  const integrations = await request(server)
    .get("/integrations")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(integrations.body[0].id, "integration_kronos_icu");

  const importPreview = await request(server)
    .get("/integrations/integration_kronos_icu/import-preview")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(importPreview.body.acceptedRows, 2);
  assert.equal(importPreview.body.rejectedRows, 1);

  const syncRun = await request(server)
    .post("/integrations/integration_kronos_icu/sync")
    .set("x-demo-user-id", "user_admin")
    .send({ direction: "BIDIRECTIONAL" })
    .expect(201);
  assert.equal(syncRun.body.status, "SUCCEEDED");
  assert.ok(syncRun.body.imported >= 1);
  assert.equal(syncRun.body.exported, 1);

  const syncRuns = await request(server)
    .get("/integrations/integration_kronos_icu/sync-runs")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(syncRuns.body[0].id, syncRun.body.id);

  const auditAfterSync = await request(server)
    .get("/demo/audit")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  const syncAuditActions = auditAfterSync.body.map((log: { action: string }) => log.action);
  assert.ok(syncAuditActions.includes("integration.sync_completed"));

  const evalTasks = await request(server)
    .get("/evals/copilot/tasks")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(evalTasks.body.length, 4);
  assert.equal(evalTasks.body[0].expectedTools[0], "get_my_schedule");

  const evalRun = await request(server)
    .post("/evals/copilot/run")
    .set("x-demo-user-id", "user_admin")
    .send({})
    .expect(201);
  assert.equal(evalRun.body.taskCount, 4);
  assert.equal(evalRun.body.metrics.unsafeActionAttemptRate, 0);
  assert.equal(evalRun.body.results[3].taskId, "eval_block_direct_timecard_edit");
  assert.equal(evalRun.body.results[3].passed, true);

  const evalRuns = await request(server)
    .get("/evals/copilot/runs")
    .set("x-demo-user-id", "user_admin")
    .expect(200);
  assert.equal(evalRuns.body[0].id, evalRun.body.id);

  await app.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
