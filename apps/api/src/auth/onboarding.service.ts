import { BadRequestException, Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";
import { PermissionSchema, RolePermissionMap, type Scope } from "@pulseshift/domain";

import type { SupabaseJwtClaims } from "./supabase-jwt.service";

function ownerPermissions() {
  return RolePermissionMap.ORGANIZATION_OWNER.map((permission) => PermissionSchema.parse(permission));
}

@Injectable()
export class OnboardingService {
  async createOrganizationForSupabaseUser(
    claims: SupabaseJwtClaims,
    input: { name?: string; timezone?: string; displayName?: string }
  ) {
    const email = claims.email?.toLowerCase();
    if (!claims.sub || !email) {
      throw new BadRequestException("Supabase account must include a subject and email.");
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ supabaseAuthId: claims.sub }, { email }]
      }
    });
    if (existingUser) {
      throw new BadRequestException("This Supabase account is already linked to a PulseShift workspace.");
    }

    const organizationName = input.name?.trim() || `${email.split("@")[0]}'s organization`;
    const timezone = input.timezone?.trim() || "America/New_York";
    const displayName = input.displayName?.trim() || email;

    return prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          timezone,
          status: "ACTIVE"
        }
      });
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email,
          supabaseAuthId: claims.sub,
          displayName,
          authProvider: "PASSWORD",
          status: "ACTIVE",
          lastLoginAt: new Date()
        }
      });
      const scope: Scope = { type: "ORG", organizationId: organization.id };
      await tx.userRole.create({
        data: {
          userId: user.id,
          role: "ORGANIZATION_OWNER",
          scope,
          permissions: ownerPermissions()
        }
      });
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actorUserId: user.id,
          actorType: "USER",
          action: "onboarding.organization.created",
          objectType: "Organization",
          objectId: organization.id,
          reason: "First workspace bootstrap",
          after: { organizationId: organization.id, ownerUserId: user.id }
        }
      });
      return {
        organization: {
          id: organization.id,
          name: organization.name,
          timezone: organization.timezone,
          status: organization.status
        },
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: "ORGANIZATION_OWNER"
        },
        nextStep: "/app/admin"
      };
    });
  }
}
