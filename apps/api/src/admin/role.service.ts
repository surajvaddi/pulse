import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@pulseshift/db";
import { PermissionSchema, RolePermissionMap, type AccountRole } from "@pulseshift/domain";

import {
  DerivedRoleGrantSchema,
  RoleAssignmentSchema,
  type DerivedRoleGrant,
  type RoleAdminServiceContract,
  type RoleAssignment
} from "./admin-contracts";
import { adminRoles, adminUsers, appendAdminAuditEvent } from "./admin-state";

function usePrismaAdmin() {
  return process.env.AUTH_PERSISTENCE === "prisma" || process.env.WORKFLOW_PERSISTENCE === "prisma";
}

function derivedGrant(input: RoleAssignment): DerivedRoleGrant {
  return DerivedRoleGrantSchema.parse({
    role: input.role,
    scope: input.scope,
    permissions: RolePermissionMap[input.role].map((permission) => PermissionSchema.parse(permission))
  });
}

@Injectable()
export class RoleAdminService implements RoleAdminServiceContract {
  async assignRole(organizationId: string, input: RoleAssignment) {
    const parsed = RoleAssignmentSchema.parse(input);
    if (usePrismaAdmin()) {
      await this.prismaUserFor(organizationId, parsed.userId);
      const grant = derivedGrant(parsed);
      await prisma.userRole.upsert({
        where: { userId_role: { userId: parsed.userId, role: parsed.role } },
        update: {
          scope: grant.scope,
          permissions: grant.permissions
        },
        create: {
          userId: parsed.userId,
          role: parsed.role,
          scope: grant.scope,
          permissions: grant.permissions
        }
      });
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorType: "SYSTEM",
          action: "admin.role.assigned",
          objectType: "UserRole",
          objectId: `${parsed.userId}:${parsed.role}`,
          reason: parsed.reason,
          after: grant
        }
      });
      return grant;
    }
    const user = this.userFor(organizationId, parsed.userId);
    const grant = derivedGrant(parsed);
    const existing = adminRoles.find((role) => role.userId === parsed.userId && role.role === parsed.role);
    if (existing) {
      existing.scope = grant.scope;
      existing.permissions = grant.permissions;
    } else {
      adminRoles.push({
        userId: parsed.userId,
        role: parsed.role,
        scope: grant.scope,
        permissions: grant.permissions
      });
    }
    if (!user.roles.includes(parsed.role)) {
      user.roles.push(parsed.role);
    }
    appendAdminAuditEvent({
      organizationId,
      action: "admin.role.assigned",
      objectType: "UserRole",
      objectId: `${parsed.userId}:${parsed.role}`,
      reason: parsed.reason,
      after: grant
    });
    return grant;
  }

  async updateScope(organizationId: string, input: RoleAssignment) {
    return this.assignRole(organizationId, input);
  }

  async removeRole(organizationId: string, userId: string, role: AccountRole, reason: string) {
    if (usePrismaAdmin()) {
      await this.prismaUserFor(organizationId, userId);
      await prisma.userRole.deleteMany({ where: { userId, role } });
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorType: "SYSTEM",
          action: "admin.role.removed",
          objectType: "UserRole",
          objectId: `${userId}:${role}`,
          reason,
          after: { userId, role }
        }
      });
      return;
    }
    const user = this.userFor(organizationId, userId);
    const index = adminRoles.findIndex((candidate) => candidate.userId === userId && candidate.role === role);
    if (index >= 0) {
      adminRoles.splice(index, 1);
    }
    user.roles = user.roles.filter((candidate) => candidate !== role);
    appendAdminAuditEvent({
      organizationId,
      action: "admin.role.removed",
      objectType: "UserRole",
      objectId: `${userId}:${role}`,
      reason,
      after: { userId, role }
    });
  }

  private userFor(organizationId: string, userId: string) {
    const user = adminUsers.find(
      (candidate) => candidate.id === userId && candidate.organizationId === organizationId
    );
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  private async prismaUserFor(organizationId: string, userId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }
}
