import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@pulseshift/db";

import {
  AdminUserRecordSchema,
  UserStatusMutationSchema,
  type AdminUserRecord,
  type UserAdminServiceContract,
  type UserStatusMutation
} from "./admin-contracts";
import { adminUsers, appendAdminAuditEvent } from "./admin-state";

function usePrismaAdmin() {
  return process.env.AUTH_PERSISTENCE === "prisma" || process.env.WORKFLOW_PERSISTENCE === "prisma";
}

@Injectable()
export class UserAdminService implements UserAdminServiceContract {
  async list(organizationId: string) {
    if (usePrismaAdmin()) {
      const users = await prisma.user.findMany({
        where: { organizationId },
        include: { roles: true },
        orderBy: { displayName: "asc" }
      });
      return users.map((user) =>
        AdminUserRecordSchema.parse({
          id: user.id,
          organizationId: user.organizationId,
          email: user.email,
          displayName: user.displayName,
          status: user.status,
          roles: user.roles.map((role) => role.role)
        })
      );
    }
    return adminUsers
      .filter((user) => user.organizationId === organizationId)
      .map((user) => AdminUserRecordSchema.parse(user));
  }

  async detail(organizationId: string, userId: string) {
    if (usePrismaAdmin()) {
      const user = await prisma.user.findFirst({
        where: { id: userId, organizationId },
        include: { roles: true }
      });
      if (!user) {
        throw new NotFoundException("User not found");
      }
      return AdminUserRecordSchema.parse({
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        roles: user.roles.map((role) => role.role)
      });
    }
    return AdminUserRecordSchema.parse(this.userFor(organizationId, userId));
  }

  async updateStatus(organizationId: string, userId: string, input: UserStatusMutation) {
    const parsed = UserStatusMutationSchema.parse(input);
    if (usePrismaAdmin()) {
      const existing = await prisma.user.findFirst({ where: { id: userId, organizationId } });
      if (!existing) {
        throw new NotFoundException("User not found");
      }
      const user = await prisma.user.update({
        where: { id: userId },
        data: { status: parsed.status },
        include: { roles: true }
      });
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorType: "SYSTEM",
          action: `admin.user.${parsed.status.toLowerCase()}`,
          objectType: "User",
          objectId: userId,
          reason: parsed.reason,
          after: { userId, status: user.status }
        }
      });
      return AdminUserRecordSchema.parse({
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        roles: user.roles.map((role) => role.role)
      });
    }
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
