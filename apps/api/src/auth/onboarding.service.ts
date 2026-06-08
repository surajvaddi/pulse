import { BadRequestException, Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";
import { PermissionSchema, RolePermissionMap, type Scope } from "@pulseshift/domain";

import type { SupabaseJwtClaims } from "./supabase-jwt.service";
import type { DemoSession } from "./demo-users";

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

  async upsertEmployeeProfile(
    session: DemoSession,
    input: {
      legalName?: string;
      preferredName?: string;
      employeeNumber?: string;
      facilityId?: string;
      unitId?: string;
      roleName?: string;
      employmentType?: "FULL_TIME" | "PART_TIME" | "PER_DIEM" | "CONTRACT" | "AGENCY";
    }
  ) {
    const legalName = input.legalName?.trim() || session.displayName || session.email;
    const roleName = input.roleName?.trim() || "RN";
    const facilityId = input.facilityId?.trim();
    const unitId = input.unitId?.trim();
    if (!facilityId || !unitId) {
      throw new BadRequestException("Facility and unit are required to create a workforce profile.");
    }

    const [facility, unit] = await Promise.all([
      prisma.facility.findFirst({ where: { id: facilityId, organizationId: session.organizationId } }),
      prisma.unit.findFirst({ where: { id: unitId, facility: { organizationId: session.organizationId } } })
    ]);
    if (!facility || !unit || unit.facilityId !== facility.id) {
      throw new BadRequestException("Profile facility and unit must belong to the current organization.");
    }

    const role = await prisma.workforceRole.upsert({
      where: { organizationId_name: { organizationId: session.organizationId, name: roleName } },
      update: {},
      create: {
        organizationId: session.organizationId,
        name: roleName,
        description: "Created during workforce profile onboarding"
      }
    });
    const profile = await prisma.employeeProfile.upsert({
      where: { userId: session.userId },
      update: {
        legalName,
        preferredName: input.preferredName?.trim() || legalName,
        primaryFacilityId: facility.id,
        primaryUnitId: unit.id,
        roleId: role.id,
        employmentType: input.employmentType ?? "FULL_TIME",
        status: "ACTIVE"
      },
      create: {
        userId: session.userId,
        organizationId: session.organizationId,
        employeeNumber: input.employeeNumber?.trim() || `EMP-${session.userId.slice(0, 8)}`,
        legalName,
        preferredName: input.preferredName?.trim() || legalName,
        primaryFacilityId: facility.id,
        primaryUnitId: unit.id,
        roleId: role.id,
        employmentType: input.employmentType ?? "FULL_TIME",
        status: "ACTIVE"
      }
    });
    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorType: "USER",
        action: "onboarding.profile.upserted",
        objectType: "EmployeeProfile",
        objectId: profile.id,
        after: { facilityId: facility.id, unitId: unit.id, roleId: role.id }
      }
    });
    return {
      id: profile.id,
      employeeNumber: profile.employeeNumber,
      legalName: profile.legalName,
      primaryFacilityId: profile.primaryFacilityId,
      primaryUnitId: profile.primaryUnitId,
      roleId: profile.roleId,
      nextStep: "/app/home"
    };
  }
}
