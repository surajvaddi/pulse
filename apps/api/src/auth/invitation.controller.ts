import { randomBytes, createHash } from "node:crypto";
import { Body, Controller, ForbiddenException, Get, Inject, Param, Post } from "@nestjs/common";
import type { AccountRole, Scope } from "@pulseshift/domain";

import type { DemoSession } from "./demo-users";
import { PermissionService } from "./permission.service";
import { CurrentSession } from "./session.decorator";

type DemoInvitation = {
  id: string;
  organizationId: string;
  email: string;
  role: AccountRole;
  scope: Scope;
  tokenHash: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  invitedByUserId: string;
  acceptedByUserId?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
};

const demoInvitations: DemoInvitation[] = [];

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Controller()
export class InvitationController {
  constructor(@Inject(PermissionService) private readonly permissions: PermissionService) {}

  @Post("users/invite")
  inviteUser(
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
    const token = randomBytes(24).toString("base64url");
    const invitation: DemoInvitation = {
      id: `invite_${demoInvitations.length + 1}`,
      organizationId: session.organizationId,
      email: body.email ?? "new.employee@example.com",
      role: body.role ?? "EMPLOYEE",
      scope: body.scope ?? { type: "SELF" },
      tokenHash: hashToken(token),
      status: "PENDING",
      invitedByUserId: session.userId,
      expiresAt: body.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    demoInvitations.push(invitation);
    return {
      ...this.publicInvitation(invitation),
      token,
      acceptUrl: `/invite/accept?token=${token}`
    };
  }

  @Get("invitations/:token")
  getInvitation(@Param("token") token: string) {
    const invitation = this.findPendingInvitation(token);
    return this.publicInvitation(invitation);
  }

  @Post("invitations/:token/accept")
  acceptInvitation(
    @CurrentSession() session: DemoSession,
    @Param("token") token: string
  ) {
    const invitation = this.findPendingInvitation(token);
    invitation.status = "ACCEPTED";
    invitation.acceptedAt = new Date().toISOString();
    invitation.acceptedByUserId = session.userId;
    return {
      ...this.publicInvitation(invitation),
      nextStep: "/onboarding/profile"
    };
  }

  private findPendingInvitation(token: string) {
    const tokenHash = hashToken(token);
    const invitation = demoInvitations.find((candidate) => candidate.tokenHash === tokenHash);
    if (!invitation || invitation.status !== "PENDING" || new Date(invitation.expiresAt) < new Date()) {
      throw new ForbiddenException("Invitation is invalid or expired");
    }
    return invitation;
  }

  private publicInvitation(invitation: DemoInvitation) {
    const { tokenHash: _tokenHash, ...safeInvitation } = invitation;
    return safeInvitation;
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
