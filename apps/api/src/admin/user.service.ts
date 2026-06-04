import { Injectable, NotFoundException } from "@nestjs/common";

import {
  AdminUserRecordSchema,
  UserStatusMutationSchema,
  type AdminUserRecord,
  type UserAdminServiceContract,
  type UserStatusMutation
} from "./admin-contracts";
import { adminUsers, appendAdminAuditEvent } from "./admin-state";

@Injectable()
export class UserAdminService implements UserAdminServiceContract {
  async list(organizationId: string) {
    return adminUsers
      .filter((user) => user.organizationId === organizationId)
      .map((user) => AdminUserRecordSchema.parse(user));
  }

  async detail(organizationId: string, userId: string) {
    return AdminUserRecordSchema.parse(this.userFor(organizationId, userId));
  }

  async updateStatus(organizationId: string, userId: string, input: UserStatusMutation) {
    const parsed = UserStatusMutationSchema.parse(input);
    const user = this.userFor(organizationId, userId);
    user.status = parsed.status;
    appendAdminAuditEvent({
      organizationId,
      action: `admin.user.${parsed.status.toLowerCase()}`,
      objectType: "User",
      objectId: userId,
      reason: parsed.reason,
      after: AdminUserRecordSchema.parse(user)
    });
    return AdminUserRecordSchema.parse(user);
  }

  private userFor(organizationId: string, userId: string): AdminUserRecord {
    const user = adminUsers.find(
      (candidate) => candidate.id === userId && candidate.organizationId === organizationId
    );
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }
}

export function activeAdminUser(userId: string) {
  const user = adminUsers.find((candidate) => candidate.id === userId);
  return !user || user.status === "ACTIVE";
}
