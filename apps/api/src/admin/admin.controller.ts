import { Body, Controller, ForbiddenException, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { CurrentSession } from "../auth/session.decorator";
import type { FacilityMutation, InvitationMutation, OrganizationSettingsUpdate, RoleAssignment, UnitMutation, UserStatusMutation } from "./admin-contracts";
import { FacilityAdminService } from "./facility.service";
import { InvitationAdminService } from "./invitation-admin.service";
import { OrganizationAdminService } from "./organization.service";
import { RoleAdminService } from "./role.service";
import { UnitAdminService } from "./unit.service";
import { UserAdminService } from "./user.service";

@Controller("admin")
export class AdminController {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(OrganizationAdminService) private readonly organizations: OrganizationAdminService,
    @Inject(FacilityAdminService) private readonly facilities: FacilityAdminService,
    @Inject(UnitAdminService) private readonly units: UnitAdminService,
    @Inject(UserAdminService) private readonly users: UserAdminService,
    @Inject(RoleAdminService) private readonly roles: RoleAdminService,
    @Inject(InvitationAdminService) private readonly invitations: InvitationAdminService
  ) {}

  @Get("organization")
  organization(@CurrentSession() session: DemoSession) {
    this.assertAdmin(session);
    return this.organizations.getSummary(session.organizationId);
  }

  @Get("setup-progress")
  setupProgress(@CurrentSession() session: DemoSession) {
    this.assertAdmin(session);
    return this.organizations.setupProgress(session.organizationId);
  }

  @Patch("organization")
  updateOrganization(@CurrentSession() session: DemoSession, @Body() body: OrganizationSettingsUpdate) {
    this.assertAdmin(session);
    return this.organizations.updateSettings(session.organizationId, body);
  }

  @Get("facilities")
  listFacilities(@CurrentSession() session: DemoSession) {
    this.assertAdmin(session);
    return this.facilities.list(session.organizationId);
  }

  @Post("facilities")
  createFacility(@CurrentSession() session: DemoSession, @Body() body: FacilityMutation) {
    this.assertAdmin(session);
    return this.facilities.create(session.organizationId, body);
  }

  @Patch("facilities/:facilityId")
  updateFacility(
    @CurrentSession() session: DemoSession,
    @Param("facilityId") facilityId: string,
    @Body() body: FacilityMutation
  ) {
    this.assertAdmin(session);
    return this.facilities.update(session.organizationId, facilityId, body);
  }

  @Post("facilities/:facilityId/deactivate")
  deactivateFacility(
    @CurrentSession() session: DemoSession,
    @Param("facilityId") facilityId: string,
    @Body() body: { reason?: string }
  ) {
    this.assertAdmin(session);
    return this.facilities.deactivate(session.organizationId, facilityId, body.reason ?? "Admin deactivation");
  }

  @Get("units")
  listUnits(@CurrentSession() session: DemoSession) {
    this.assertAdmin(session);
    return this.units.list(session.organizationId);
  }

  @Post("units")
  createUnit(@CurrentSession() session: DemoSession, @Body() body: UnitMutation) {
    this.assertAdmin(session);
    return this.units.create(session.organizationId, body);
  }

  @Patch("units/:unitId")
  updateUnit(@CurrentSession() session: DemoSession, @Param("unitId") unitId: string, @Body() body: UnitMutation) {
    this.assertAdmin(session);
    return this.units.update(session.organizationId, unitId, body);
  }

  @Post("units/:unitId/managers")
  assignManagers(
    @CurrentSession() session: DemoSession,
    @Param("unitId") unitId: string,
    @Body() body: { managerUserIds?: string[]; reason?: string }
  ) {
    this.assertAdmin(session);
    return this.units.assignManagers(session.organizationId, unitId, body.managerUserIds ?? [], body.reason ?? "Manager assignment");
  }

  @Post("units/:unitId/deactivate")
  deactivateUnit(@CurrentSession() session: DemoSession, @Param("unitId") unitId: string, @Body() body: { reason?: string }) {
    this.assertAdmin(session);
    return this.units.deactivate(session.organizationId, unitId, body.reason ?? "Admin deactivation");
  }

  @Get("users")
  listUsers(@CurrentSession() session: DemoSession) {
    this.assertAdmin(session);
    return this.users.list(session.organizationId);
  }

  @Get("users/:userId")
  userDetail(@CurrentSession() session: DemoSession, @Param("userId") userId: string) {
    this.assertAdmin(session);
    return this.users.detail(session.organizationId, userId);
  }

  @Patch("users/:userId/status")
  updateUserStatus(
    @CurrentSession() session: DemoSession,
    @Param("userId") userId: string,
    @Body() body: UserStatusMutation
  ) {
    this.assertAdmin(session);
    return this.users.updateStatus(session.organizationId, userId, body);
  }

  @Post("roles")
  assignRole(@CurrentSession() session: DemoSession, @Body() body: RoleAssignment) {
    this.assertAdmin(session);
    return this.roles.assignRole(session.organizationId, body);
  }

  @Patch("roles/scope")
  updateRoleScope(@CurrentSession() session: DemoSession, @Body() body: RoleAssignment) {
    this.assertAdmin(session);
    return this.roles.updateScope(session.organizationId, body);
  }

  @Post("roles/remove")
  removeRole(@CurrentSession() session: DemoSession, @Body() body: { userId: string; role: RoleAssignment["role"]; reason?: string }) {
    this.assertAdmin(session);
    return this.roles.removeRole(session.organizationId, body.userId, body.role, body.reason ?? "Role removal");
  }

  @Get("invitations")
  listInvitations(@CurrentSession() session: DemoSession) {
    this.assertAdmin(session);
    return this.invitations.list(session.organizationId);
  }

  @Post("invitations")
  createInvitation(@CurrentSession() session: DemoSession, @Body() body: InvitationMutation) {
    this.assertAdmin(session);
    return this.invitations.create(session.organizationId, session.userId, body);
  }

  @Post("invitations/:invitationId/revoke")
  revokeInvitation(
    @CurrentSession() session: DemoSession,
    @Param("invitationId") invitationId: string,
    @Body() body: { reason?: string }
  ) {
    this.assertAdmin(session);
    return this.invitations.revoke(session.organizationId, invitationId, body.reason ?? "Invitation revoked");
  }

  @Post("invitations/:invitationId/resend")
  resendInvitation(
    @CurrentSession() session: DemoSession,
    @Param("invitationId") invitationId: string,
    @Body() body: { reason?: string }
  ) {
    this.assertAdmin(session);
    return this.invitations.resendMetadata(session.organizationId, invitationId, body.reason ?? "Invitation resent");
  }

  private assertAdmin(session: DemoSession) {
    if (
      !this.permissions.hasPermission(session, "user:manage", {
        type: "ORG",
        organizationId: session.organizationId
      })
    ) {
      throw new ForbiddenException("Only organization admins can use administration routes");
    }
  }
}
