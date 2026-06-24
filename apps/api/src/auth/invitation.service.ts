import { randomBytes, createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { prisma } from "@pulseshift/db";
import {
  InvitationWorkforceAssignmentSchema,
  ScopeSchema,
  onboardingRequirementsForRole,
  type AccountRole,
  type InvitationWorkforceAssignment,
  type Scope
} from "@pulseshift/domain";

import { AuthSessionService } from "./auth-session.service";
import type { DemoSession } from "./demo-users";
import type { SupabaseJwtClaims } from "./supabase-jwt.service";

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
  workforceAssignment?: InvitationWorkforceAssignment;
};

const demoInvitations: DemoInvitation[] = [];

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function authPersistenceEnabled() {
  return process.env.AUTH_PERSISTENCE === "prisma" || process.env.WORKFLOW_PERSISTENCE === "prisma";
}

function publicInvitation(invitation: DemoInvitation) {
  const { tokenHash: _tokenHash, ...safeInvitation } = invitation;
  return safeInvitation;
}

type PrismaInvitation = {
  id: string;
  organizationId: string;
  email: string;
  role: AccountRole;
  scope: unknown;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  invitedByUserId: string;
  acceptedByUserId: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  facilityId: string | null;
  unitId: string | null;
  workforceRoleId: string | null;
  employmentType: InvitationWorkforceAssignment["employmentType"] | null;
  employeeNumberPolicy: InvitationWorkforceAssignment["employeeNumberPolicy"] | null;
  employeeNumber: string | null;
};

@Injectable()
export class InvitationService {
  constructor(@Inject(AuthSessionService) private readonly sessions: AuthSessionService) {}

  async createInvitation(args: {
    organizationId: string;
    email: string;
    role: AccountRole;
    scope: Scope;
    invitedByUserId: string;
    expiresAt?: string;
    workforceAssignment?: InvitationWorkforceAssignment;
  }) {
    const token = randomBytes(24).toString("base64url");
    const expiresAt = args.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const workforceAssignment = args.workforceAssignment
      ? InvitationWorkforceAssignmentSchema.parse(args.workforceAssignment)
      : undefined;
    const requiresWorkforceAssignment =
      onboardingRequirementsForRole(args.role).requiresEmployeeProfile;

    if (requiresWorkforceAssignment && !workforceAssignment) {
      throw new BadRequestException(
        "This account role requires an organization-assigned workforce placement."
      );
    }
    if (!requiresWorkforceAssignment && workforceAssignment) {
      throw new BadRequestException(
        "Administrative account roles cannot receive a workforce placement through this invitation."
      );
    }

    if (authPersistenceEnabled()) {
      if (workforceAssignment) {
        await this.validateWorkforceAssignment(args.organizationId, workforceAssignment);
      }
      const invitation = await prisma.invitation.create({
        data: {
          organizationId: args.organizationId,
          email: args.email.toLowerCase(),
          role: args.role,
          scope: args.scope,
          ...(workforceAssignment
            ? {
                facilityId: workforceAssignment.facilityId,
                unitId: workforceAssignment.unitId,
                workforceRoleId: workforceAssignment.workforceRoleId,
                employmentType: workforceAssignment.employmentType,
                employeeNumberPolicy: workforceAssignment.employeeNumberPolicy,
                employeeNumber: workforceAssignment.employeeNumber ?? null
              }
            : {}),
          tokenHash: hashToken(token),
          status: "PENDING",
          invitedByUserId: args.invitedByUserId,
          expiresAt: new Date(expiresAt)
        }
      });
      return {
        ...this.publicPrismaInvitation(invitation),
        token,
        acceptUrl: `/invite/accept?token=${token}`
      };
    }

    const invitation: DemoInvitation = {
      id: `invite_${demoInvitations.length + 1}`,
      organizationId: args.organizationId,
      email: args.email.toLowerCase(),
      role: args.role,
      scope: args.scope,
      tokenHash: hashToken(token),
      status: "PENDING",
      invitedByUserId: args.invitedByUserId,
      expiresAt,
      createdAt: new Date().toISOString(),
      ...(workforceAssignment ? { workforceAssignment } : {})
    };
    demoInvitations.push(invitation);
    return {
      ...publicInvitation(invitation),
      token,
      acceptUrl: `/invite/accept?token=${token}`
    };
  }

  async getPublicInvitation(token: string) {
    const invitation = await this.findPendingInvitation(token);
    return authPersistenceEnabled()
      ? this.publicPrismaInvitation(invitation as PrismaInvitation)
      : publicInvitation(invitation as DemoInvitation);
  }

  async acceptInvitation(args: {
    token: string;
    session?: DemoSession;
    claims?: SupabaseJwtClaims;
  }) {
    const invitation = await this.findPendingInvitation(args.token);
    const acceptedAt = new Date();

    if (authPersistenceEnabled()) {
      const prismaInvitation = invitation as PrismaInvitation;
      const claims = args.claims;
      if (!claims?.sub || !claims.email) {
        throw new UnauthorizedException("Sign in with Supabase before accepting this invitation");
      }
      if (claims.email.toLowerCase() !== prismaInvitation.email.toLowerCase()) {
        throw new ForbiddenException("Signed-in email does not match this invitation");
      }

      const user = await this.sessions.acceptInvitationForSupabaseUser({
        organizationId: prismaInvitation.organizationId,
        email: prismaInvitation.email,
        role: prismaInvitation.role,
        scope: ScopeSchema.parse(prismaInvitation.scope),
        supabaseAuthId: claims.sub,
        displayName: claims.email,
        ...(this.workforceAssignmentFromPrisma(prismaInvitation)
          ? { workforceAssignment: this.workforceAssignmentFromPrisma(prismaInvitation) }
          : {})
      });

      const accepted = await prisma.invitation.update({
        where: { id: prismaInvitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt,
          acceptedByUserId: user.id
        }
      });

      return {
        ...this.publicPrismaInvitation(accepted),
        nextStep: "/onboarding/profile"
      };
    }

    const demoInvitation = invitation as DemoInvitation;
    if (!args.session) {
      throw new UnauthorizedException("Sign in before accepting this invitation");
    }
    demoInvitation.status = "ACCEPTED";
    demoInvitation.acceptedAt = acceptedAt.toISOString();
    demoInvitation.acceptedByUserId = args.session.userId;
    return {
      ...publicInvitation(demoInvitation),
      nextStep: "/onboarding/profile"
    };
  }

  async listPendingForEmail(email: string) {
    const normalized = email.toLowerCase();
    if (authPersistenceEnabled()) {
      const invitations = await prisma.invitation.findMany({
        where: {
          email: normalized,
          status: "PENDING",
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: "desc" }
      });
      return invitations.map((invitation) => this.publicPrismaInvitation(invitation));
    }

    return demoInvitations
      .filter(
        (invitation) =>
          invitation.email === normalized &&
          invitation.status === "PENDING" &&
          new Date(invitation.expiresAt) > new Date()
      )
      .map((invitation) => publicInvitation(invitation));
  }

  private async findPendingInvitation(token: string) {
    const tokenHash = hashToken(token);
    if (authPersistenceEnabled()) {
      const invitation = await prisma.invitation.findUnique({ where: { tokenHash } });
      if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
        throw new ForbiddenException("Invitation is invalid or expired");
      }
      return invitation;
    }

    const invitation = demoInvitations.find((candidate) => candidate.tokenHash === tokenHash);
    if (!invitation || invitation.status !== "PENDING" || new Date(invitation.expiresAt) < new Date()) {
      throw new ForbiddenException("Invitation is invalid or expired");
    }
    return invitation;
  }

  private publicPrismaInvitation(invitation: PrismaInvitation) {
    const workforceAssignment = this.workforceAssignmentFromPrisma(invitation);
    const result = {
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      scope: ScopeSchema.parse(invitation.scope),
      status: invitation.status,
      invitedByUserId: invitation.invitedByUserId,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString()
    };
    return {
      ...result,
      ...(workforceAssignment ? { workforceAssignment } : {}),
      ...(invitation.acceptedByUserId ? { acceptedByUserId: invitation.acceptedByUserId } : {}),
      ...(invitation.acceptedAt ? { acceptedAt: invitation.acceptedAt.toISOString() } : {})
    };
  }

  private workforceAssignmentFromPrisma(
    invitation: PrismaInvitation
  ): InvitationWorkforceAssignment | undefined {
    if (
      !invitation.facilityId ||
      !invitation.unitId ||
      !invitation.workforceRoleId ||
      !invitation.employmentType ||
      !invitation.employeeNumberPolicy
    ) {
      return undefined;
    }
    return InvitationWorkforceAssignmentSchema.parse({
      facilityId: invitation.facilityId,
      unitId: invitation.unitId,
      workforceRoleId: invitation.workforceRoleId,
      employmentType: invitation.employmentType,
      employeeNumberPolicy: invitation.employeeNumberPolicy,
      ...(invitation.employeeNumber ? { employeeNumber: invitation.employeeNumber } : {})
    });
  }

  private async validateWorkforceAssignment(
    organizationId: string,
    assignment: InvitationWorkforceAssignment
  ) {
    const [facility, unit, workforceRole, duplicateEmployeeNumber] = await Promise.all([
      prisma.facility.findFirst({ where: { id: assignment.facilityId, organizationId } }),
      prisma.unit.findFirst({
        where: { id: assignment.unitId, facility: { organizationId } }
      }),
      prisma.workforceRole.findFirst({
        where: { id: assignment.workforceRoleId, organizationId }
      }),
      assignment.employeeNumber
        ? prisma.employeeProfile.findFirst({
            where: { organizationId, employeeNumber: assignment.employeeNumber }
          })
        : null
    ]);
    if (!facility || !unit || unit.facilityId !== facility.id || !workforceRole) {
      throw new BadRequestException(
        "Invitation workforce placement must belong to the current organization."
      );
    }
    if (duplicateEmployeeNumber) {
      throw new ConflictException(
        `Employee number ${assignment.employeeNumber} is already in use.`
      );
    }
  }
}
