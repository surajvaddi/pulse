import { Body, Controller, ForbiddenException, Get, Inject, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import type { AccountRole, Scope } from "@pulseshift/domain";

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
      scope?: Scope;
      expiresAt?: string;
    }
  ) {
    this.assertUserAdmin(session);
    const invitation = {
      organizationId: session.organizationId,
      email: body.email ?? "new.employee@example.com",
      role: body.role ?? "EMPLOYEE",
      scope: body.scope ?? { type: "SELF" },
      invitedByUserId: session.userId
    };
    return this.invitations.createInvitation(
      body.expiresAt ? { ...invitation, expiresAt: body.expiresAt } : invitation
    );
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
