import { Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@pulseshift/db";
import {
  PermissionSchema,
  RolePermissionMap,
  ScopeSchema,
  onboardingRequirementsForRole,
  type AccountRole,
  type PermissionGrant,
  type Scope
} from "@pulseshift/domain";

import {
  findDemoSessionBySupabaseAuthId,
  type DemoSession
} from "./demo-users";
import type { PermissionService } from "./permission.service";
import type { SupabaseJwtClaims } from "./supabase-jwt.service";

function scopeFromJson(value: unknown): Scope {
  return ScopeSchema.parse(value);
}

function permissionsFor(role: AccountRole) {
  return RolePermissionMap[role].map((permission) => PermissionSchema.parse(permission));
}

@Injectable()
export class AuthSessionService {
  async loadSupabaseSession(claims: SupabaseJwtClaims): Promise<DemoSession> {
    try {
      return findDemoSessionBySupabaseAuthId(claims.sub);
    } catch {
      return this.loadDatabaseSession(claims);
    }
  }

  private async loadDatabaseSession(claims: SupabaseJwtClaims): Promise<DemoSession> {
    const email = claims.email?.toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseAuthId: claims.sub },
          ...(email ? [{ email }] : [])
        ]
      },
      include: { roles: true }
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Supabase auth user is not linked to an active PulseShift user");
    }

    if (user.supabaseAuthId !== claims.sub) {
      await prisma.user.update({
        where: { id: user.id },
        data: { supabaseAuthId: claims.sub, lastLoginAt: new Date() }
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
    }

    const primaryRole = user.roles.at(0);
    if (!primaryRole) {
      throw new UnauthorizedException("PulseShift user does not have an assigned role");
    }

    const grants: PermissionGrant[] = user.roles.flatMap((role) => {
      const scope = scopeFromJson(role.scope);
      return role.permissions.map((permission) => ({
        permission: PermissionSchema.parse(permission),
        scope
      }));
    });

    return {
      userId: user.id,
      supabaseAuthId: claims.sub,
      organizationId: user.organizationId,
      displayName: user.displayName,
      email: user.email,
      role: primaryRole.role,
      grants
    };
  }

  async buildMeResponse(session: DemoSession, permissions: PermissionService) {
    const base = {
      ...session,
      permissions: permissions.effectivePermissions(session),
      scopes: permissions.effectiveScopes(session)
    };

    if (session.userId.startsWith("user_")) {
      return {
        ...base,
        employeeProfile: null,
        needsProfileOnboarding: false,
        needsNotificationPreferencesOnboarding: false,
        needsIntegrationsOnboarding: false,
        facilityCount: 1
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        notificationPreferencesOnboardedAt: true,
        integrationsOnboardingCompletedAt: true
      }
    });

    const [employeeProfile, facilityCount, acceptedWorkforceInvitation] = await Promise.all([
      prisma.employeeProfile.findUnique({
        where: { userId: session.userId },
        select: {
          id: true,
          employeeNumber: true,
          legalName: true,
          primaryFacilityId: true,
          primaryUnitId: true
        }
      }),
      prisma.facility.count({ where: { organizationId: session.organizationId } }),
      prisma.invitation.findFirst({
        where: {
          organizationId: session.organizationId,
          acceptedByUserId: session.userId,
          status: "ACCEPTED",
          facilityId: { not: null },
          unitId: { not: null },
          workforceRoleId: { not: null }
        },
        orderBy: { acceptedAt: "desc" },
        select: {
          facilityId: true,
          unitId: true,
          workforceRoleId: true,
          employmentType: true,
          employeeNumberPolicy: true,
          employeeNumber: true
        }
      })
    ]);
    const workforceOnboardingAssignment = acceptedWorkforceInvitation
      ? await this.describeWorkforceAssignment(
          session.organizationId,
          acceptedWorkforceInvitation
        )
      : null;

    const onboardingRequirements = onboardingRequirementsForRole(session.role);

    return {
      ...base,
      employeeProfile,
      workforceOnboardingAssignment,
      needsProfileOnboarding:
        onboardingRequirements.requiresEmployeeProfile && !employeeProfile,
      needsNotificationPreferencesOnboarding:
        onboardingRequirements.requiresNotificationPreferences &&
        !user?.notificationPreferencesOnboardedAt,
      needsIntegrationsOnboarding:
        onboardingRequirements.requiresIntegrations &&
        !user?.integrationsOnboardingCompletedAt,
      facilityCount
    };
  }

  private async describeWorkforceAssignment(
    organizationId: string,
    assignment: {
      facilityId: string | null;
      unitId: string | null;
      workforceRoleId: string | null;
      employmentType: string | null;
      employeeNumberPolicy: string | null;
      employeeNumber: string | null;
    }
  ) {
    if (
      !assignment.facilityId ||
      !assignment.unitId ||
      !assignment.workforceRoleId ||
      !assignment.employmentType ||
      !assignment.employeeNumberPolicy
    ) {
      return null;
    }
    const [facility, unit, workforceRole] = await Promise.all([
      prisma.facility.findFirst({
        where: { id: assignment.facilityId, organizationId },
        select: { id: true, name: true }
      }),
      prisma.unit.findFirst({
        where: {
          id: assignment.unitId,
          facility: { organizationId }
        },
        select: { id: true, name: true, facilityId: true }
      }),
      prisma.workforceRole.findFirst({
        where: { id: assignment.workforceRoleId, organizationId },
        select: { id: true, name: true }
      })
    ]);
    if (!facility || !unit || unit.facilityId !== facility.id || !workforceRole) {
      return null;
    }
    return {
      facility,
      unit: { id: unit.id, name: unit.name },
      workforceRole,
      employmentType: assignment.employmentType,
      employeeNumberPolicy: assignment.employeeNumberPolicy,
      employeeNumber: assignment.employeeNumber
    };
  }

  async acceptInvitationForSupabaseUser(args: {
    organizationId: string;
    email: string;
    role: AccountRole;
    scope: Scope;
    supabaseAuthId: string;
    displayName?: string;
  }) {
    const email = args.email.toLowerCase();
    const permissions = permissionsFor(args.role);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        supabaseAuthId: args.supabaseAuthId,
        status: "ACTIVE",
        displayName: args.displayName ?? email
      },
      create: {
        organizationId: args.organizationId,
        email,
        supabaseAuthId: args.supabaseAuthId,
        displayName: args.displayName ?? email,
        authProvider: "PASSWORD",
        status: "ACTIVE"
      }
    });

    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role: args.role } },
      update: {
        scope: args.scope,
        permissions
      },
      create: {
        userId: user.id,
        role: args.role,
        scope: args.scope,
        permissions
      }
    });

    return user;
  }
}
