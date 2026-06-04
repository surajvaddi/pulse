import { Injectable, NotFoundException } from "@nestjs/common";
import { PermissionSchema, RolePermissionMap, type AccountRole } from "@pulseshift/domain";

import {
  DerivedRoleGrantSchema,
  RoleAssignmentSchema,
  type DerivedRoleGrant,
  type RoleAdminServiceContract,
  type RoleAssignment
} from "./admin-contracts";
import { adminRoles, adminUsers } from "./admin-state";

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
    return grant;
  }

  async updateScope(organizationId: string, input: RoleAssignment) {
    return this.assignRole(organizationId, input);
  }

  async removeRole(organizationId: string, userId: string, role: AccountRole, _reason: string) {
    const user = this.userFor(organizationId, userId);
    const index = adminRoles.findIndex((candidate) => candidate.userId === userId && candidate.role === role);
    if (index >= 0) {
      adminRoles.splice(index, 1);
    }
    user.roles = user.roles.filter((candidate) => candidate !== role);
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
}
