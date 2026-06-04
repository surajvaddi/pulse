import { Injectable, NotFoundException } from "@nestjs/common";

import {
  InvitationMutationSchema,
  InvitationRecordSchema,
  type InvitationAdminServiceContract,
  type InvitationMutation,
  type InvitationRecord
} from "./admin-contracts";
import { adminInvitations, invitationStatusFor } from "./admin-state";

@Injectable()
export class InvitationAdminService implements InvitationAdminServiceContract {
  async list(organizationId: string) {
    return adminInvitations
      .filter((invitation) => invitation.organizationId === organizationId)
      .map((invitation) => this.publicRecord(invitation));
  }

  async create(organizationId: string, invitedByUserId: string, input: InvitationMutation) {
    const parsed = InvitationMutationSchema.parse(input);
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
    return this.publicRecord(invitation);
  }

  async revoke(organizationId: string, invitationId: string, _reason: string) {
    const invitation = this.invitationFor(organizationId, invitationId);
    invitation.status = "REVOKED";
    return this.publicRecord(invitation);
  }

  async resendMetadata(organizationId: string, invitationId: string, _reason: string) {
    const invitation = this.invitationFor(organizationId, invitationId);
    invitation.tokenVersion += 1;
    invitation.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    invitation.status = "PENDING";
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
