import {
  Body,
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException
} from "@nestjs/common";
import type { Request } from "express";
import type {
  AccountRole,
  InvitationScopeSelection,
  InvitationWorkforceAssignment,
} from "@pulseshift/domain";
import { scopeForInvitation } from "@pulseshift/domain";

import type { DemoSession } from "./demo-users";
import { InvitationService } from "./invitation.service";
import { PermissionService } from "./permission.service";
import { CurrentSession } from "./session.decorator";
import type { SupabaseJwtClaims } from "./supabase-jwt.service";

@Controller()
export class InvitationController {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(InvitationService) private readonly invitations: InvitationService
  ) {}

  @Post("users/invite")
  async inviteUser(
    @CurrentSession() session: DemoSession,
    @Body()
    body: {
      email?: string;
      role?: AccountRole;
      selection?: Omit<InvitationScopeSelection, "organizationId">;
      expiresAt?: string;
      workforceAssignment?: InvitationWorkforceAssignment;
    }
  ) {
    this.assertUserAdmin(session);
    const role = body.role ?? "EMPLOYEE";
    let scope;
    try {
      scope = scopeForInvitation(role, {
        organizationId: session.organizationId,
        ...(body.selection?.facilityIds
          ? { facilityIds: body.selection.facilityIds }
          : {}),
        ...(body.selection?.unitIds ? { unitIds: body.selection.unitIds } : {})
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid invitation scope."
      );
    }
    const invitation = {
      organizationId: session.organizationId,
      email: body.email ?? "new.employee@example.com",
      role,
      scope,
      invitedByUserId: session.userId,
      ...(body.workforceAssignment
        ? { workforceAssignment: body.workforceAssignment }
        : {})
    };
    return this.invitations.createInvitation(
      body.expiresAt ? { ...invitation, expiresAt: body.expiresAt } : invitation
    );
  }

  @Get("invitations/pending")
  listPendingInvitations(
    @Req()
    request: Request & {
      supabaseClaims?: SupabaseJwtClaims;
    }
  ) {
    const email = request.supabaseClaims?.email?.toLowerCase();
    if (!email) {
      throw new UnauthorizedException("Sign in with Supabase before checking pending invitations.");
    }
    return this.invitations.listPendingForEmail(email);
  }

  @Post("invitations/pending/:invitationId/accept")
  acceptPendingInvitation(
    @Param("invitationId") invitationId: string,
    @Body() body: { acceptanceHandle?: string },
    @Req()
    request: Request & {
      supabaseClaims?: SupabaseJwtClaims;
    }
  ) {
    if (!body.acceptanceHandle) {
      throw new BadRequestException("Invitation acceptance handle is required.");
    }
    return this.invitations.acceptPendingInvitation({
      invitationId,
      acceptanceHandle: body.acceptanceHandle,
      ...(request.supabaseClaims ? { claims: request.supabaseClaims } : {})
    });
  }

  @Get("invitations/:token")
  async getInvitation(@Param("token") token: string) {
    return this.invitations.getPublicInvitation(token);
  }

  @Post("invitations/:token/accept")
  async acceptInvitation(
    @CurrentSession() session: DemoSession | undefined,
    @Param("token") token: string,
    @Req()
    request: Request & {
      supabaseClaims?: SupabaseJwtClaims;
    }
  ) {
    const invitation = {
      token,
      ...(session ? { session } : {}),
      ...(request.supabaseClaims ? { claims: request.supabaseClaims } : {})
    };
    return this.invitations.acceptInvitation(invitation);
  }

  private assertUserAdmin(session: DemoSession) {
    if (
      !this.permissions.hasPermission(session, "user:manage", {
        type: "ORG",
        organizationId: session.organizationId
      })
    ) {
      throw new ForbiddenException("Only organization admins can invite users");
    }
  }
}
