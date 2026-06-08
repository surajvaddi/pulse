import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@pulseshift/db";
import { createHash, randomBytes } from "node:crypto";

import {
  InvitationMutationSchema,
  InvitationRecordSchema,
  type InvitationAdminServiceContract,
  type InvitationMutation,
  type InvitationRecord
} from "./admin-contracts";
import { adminInvitations, appendAdminAuditEvent, invitationStatusFor } from "./admin-state";

function usePrismaAdmin() {
  return process.env.AUTH_PERSISTENCE === "prisma" || process.env.WORKFLOW_PERSISTENCE === "prisma";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class InvitationAdminService implements InvitationAdminServiceContract {
  async list(organizationId: string) {
    if (usePrismaAdmin()) {
      const invitations = await prisma.invitation.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" }
      });
      return invitations.map((invitation) =>
        InvitationRecordSchema.parse({
          id: invitation.id,
          organizationId: invitation.organizationId,
          email: invitation.email,
          role: invitation.role,
          scope: invitation.scope,
          status: invitation.status,
          invitedByUserId: invitation.invitedByUserId,
          ...(invitation.acceptedByUserId ? { acceptedByUserId: invitation.acceptedByUserId } : {})
        })
      );
    }
    return adminInvitations
      .filter((invitation) => invitation.organizationId === organizationId)
      .map((invitation) => this.publicRecord(invitation));
  }

  async create(organizationId: string, invitedByUserId: string, input: InvitationMutation) {
    const parsed = InvitationMutationSchema.parse(input);
    if (usePrismaAdmin()) {
      const token = randomBytes(24).toString("base64url");
      const invitation = await prisma.invitation.create({
        data: {
          organizationId,
          email: parsed.email.toLowerCase(),
          role: parsed.role,
          scope: parsed.scope,
          tokenHash: hashToken(token),
          status: "PENDING",
          invitedByUserId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
        }
      });
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorUserId: invitedByUserId,
          actorType: "USER",
          action: "admin.invitation.created",
          objectType: "Invitation",
          objectId: invitation.id,
          reason: parsed.reason,
          after: { email: invitation.email, role: invitation.role }
        }
      });
      return {
        ...InvitationRecordSchema.parse({
          id: invitation.id,
          organizationId: invitation.organizationId,
          email: invitation.email,
          role: invitation.role,
          scope: invitation.scope,
          status: invitation.status,
          invitedByUserId: invitation.invitedByUserId
        }),
        token,
        acceptUrl: `/invite/accept?token=${encodeURIComponent(token)}`
      };
    }
    const invitation = {
      id: `admin_invite_${adminInvitations.length + 1}`,
      organizationId,
      email: parsed.email.toLowerCase(),
      role: parsed.role,
      scope: parsed.scope,
      status: "PENDING" as const,
      invitedByUserId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      tokenVersion: 1
    };
    adminInvitations.push(invitation);
    appendAdminAuditEvent({
      organizationId,
      action: "admin.invitation.created",
      objectType: "Invitation",
      objectId: invitation.id,
      reason: parsed.reason,
      after: this.publicRecord(invitation)
    });
    return this.publicRecord(invitation);
  }

  async revoke(organizationId: string, invitationId: string, reason: string) {
    if (usePrismaAdmin()) {
      const existing = await prisma.invitation.findFirst({ where: { id: invitationId, organizationId } });
      if (!existing) {
        throw new NotFoundException("Invitation not found");
      }
      const invitation = await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: "REVOKED" }
      });
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorType: "SYSTEM",
          action: "admin.invitation.revoked",
          objectType: "Invitation",
          objectId: invitationId,
          reason,
          after: { status: invitation.status }
        }
      });
      return InvitationRecordSchema.parse({
        id: invitation.id,
        organizationId: invitation.organizationId,
        email: invitation.email,
        role: invitation.role,
        scope: invitation.scope,
        status: invitation.status,
        invitedByUserId: invitation.invitedByUserId,
        ...(invitation.acceptedByUserId ? { acceptedByUserId: invitation.acceptedByUserId } : {})
      });
    }
    const invitation = this.invitationFor(organizationId, invitationId);
    invitation.status = "REVOKED";
    appendAdminAuditEvent({
      organizationId,
      action: "admin.invitation.revoked",
      objectType: "Invitation",
      objectId: invitationId,
      reason,
      after: this.publicRecord(invitation)
    });
    return this.publicRecord(invitation);
  }

  async resendMetadata(organizationId: string, invitationId: string, reason: string) {
    if (usePrismaAdmin()) {
      const existing = await prisma.invitation.findFirst({ where: { id: invitationId, organizationId } });
      if (!existing) {
        throw new NotFoundException("Invitation not found");
      }
      const invitation = await prisma.invitation.update({
        where: { id: invitationId },
        data: {
          status: "PENDING",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
        }
      });
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorType: "SYSTEM",
          action: "admin.invitation.resent",
          objectType: "Invitation",
          objectId: invitationId,
          reason,
          after: { status: invitation.status }
        }
      });
      return InvitationRecordSchema.parse({
        id: invitation.id,
        organizationId: invitation.organizationId,
        email: invitation.email,
        role: invitation.role,
        scope: invitation.scope,
        status: invitation.status,
        invitedByUserId: invitation.invitedByUserId,
        ...(invitation.acceptedByUserId ? { acceptedByUserId: invitation.acceptedByUserId } : {})
      });
    }
    const invitation = this.invitationFor(organizationId, invitationId);
    invitation.tokenVersion += 1;
    invitation.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    invitation.status = "PENDING";
    appendAdminAuditEvent({
      organizationId,
      action: "admin.invitation.resent",
      objectType: "Invitation",
      objectId: invitationId,
      reason,
      after: { tokenVersion: invitation.tokenVersion, status: invitation.status }
    });
    return this.publicRecord(invitation);
  }

  private invitationFor(organizationId: string, invitationId: string) {
    const invitation = adminInvitations.find(
      (candidate) => candidate.id === invitationId && candidate.organizationId === organizationId
    );
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }
    return invitation;
  }

  private publicRecord(invitation: (typeof adminInvitations)[number]): InvitationRecord {
    const { expiresAt: _expiresAt, tokenVersion: _tokenVersion, ...publicInvitation } = invitation;
    return InvitationRecordSchema.parse({
      ...publicInvitation,
      status: invitationStatusFor(invitation)
    });
  }
}
