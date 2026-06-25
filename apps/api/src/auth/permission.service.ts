import { Injectable } from "@nestjs/common";
import type { Permission, PermissionGrant, Scope } from "@pulseshift/domain";

import type { DemoSession } from "./demo-users";

export type ObjectScope =
  | { type: "SELF"; userId: string }
  | { type: "UNIT"; unitId: string }
  | { type: "FACILITY"; facilityId: string }
  | { type: "ORG"; organizationId: string };

@Injectable()
export class PermissionService {
  hasPermission(session: DemoSession, permission: Permission, objectScope?: ObjectScope): boolean {
    return session.grants.some((grant) => {
      if (grant.permission !== permission) {
        return false;
      }

      if (!objectScope) {
        return true;
      }

      return this.scopeAllows(session, grant, objectScope);
    });
  }

  assertPermission(session: DemoSession, permission: Permission, objectScope?: ObjectScope): void {
    if (!this.hasPermission(session, permission, objectScope)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  private scopeAllows(session: DemoSession, grant: PermissionGrant, objectScope: ObjectScope): boolean {
    if (grant.scope.type === "ORG") {
      if (grant.scope.organizationId !== session.organizationId) {
        return false;
      }
      return objectScope.type === "ORG"
        ? grant.scope.organizationId === objectScope.organizationId
        : true;
    }

    if (grant.scope.type === "SELF") {
      return objectScope.type === "SELF" && objectScope.userId === session.userId;
    }

    if (grant.scope.type === "UNIT") {
      return objectScope.type === "UNIT" && grant.scope.unitIds.includes(objectScope.unitId);
    }

    if (grant.scope.type === "FACILITY") {
      return objectScope.type === "FACILITY" && grant.scope.facilityIds.includes(objectScope.facilityId);
    }

    return false;
  }

  effectivePermissions(session: DemoSession): Permission[] {
    return [...new Set(session.grants.map((grant) => grant.permission))];
  }

  effectiveScopes(session: DemoSession): Scope[] {
    return session.grants.map((grant) => grant.scope);
  }
}
