import { Inject, Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";

import { demoNotifications } from "./demo-data";
import type { NotificationRecord, NotificationRepository } from "../workflows/repository-contracts";

type NotificationType =
  | "SHIFT_ASSIGNED"
  | "SHIFT_UPDATED"
  | "SWAP_REQUESTED"
  | "SWAP_APPROVED"
  | "SWAP_DENIED"
  | "OPEN_SHIFT_AVAILABLE"
  | "TIMECARD_EXCEPTION"
  | "STAFFING_RISK"
  | "APPROVAL_REQUIRED";

type PrismaNotificationRecord = {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "READ";
  payload: unknown;
};

function persistenceEnabled() {
  return process.env.WORKFLOW_PERSISTENCE === "prisma";
}

function mapPayload(payload: unknown): Record<string, string> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(payload).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

function mapNotification(notification: PrismaNotificationRecord): NotificationRecord {
  return {
    id: notification.id,
    recipientUserId: notification.recipientUserId,
    type: notification.type,
    status: notification.status === "READ" ? "READ" : "QUEUED",
    payload: mapPayload(notification.payload)
  };
}

function asNotificationType(type: string): NotificationType {
  const knownTypes: NotificationType[] = [
    "SHIFT_ASSIGNED",
    "SHIFT_UPDATED",
    "SWAP_REQUESTED",
    "SWAP_APPROVED",
    "SWAP_DENIED",
    "OPEN_SHIFT_AVAILABLE",
    "TIMECARD_EXCEPTION",
    "STAFFING_RISK",
    "APPROVAL_REQUIRED"
  ];
  if (knownTypes.includes(type as NotificationType)) {
    return type as NotificationType;
  }
  return "SHIFT_UPDATED";
}

function notFoundNotification(notificationId: string, recipientUserId: string): NotificationRecord {
  return {
    id: notificationId,
    recipientUserId,
    type: "NOT_FOUND",
    status: "READ",
    payload: {}
  };
}

@Injectable()
export class InMemoryNotificationRepository implements NotificationRepository {
  async listNotifications(query: {
    organizationId: string;
    recipientUserId: string;
    status?: NotificationRecord["status"];
  }) {
    return demoNotifications.filter((notification) => {
      if (notification.recipientUserId !== query.recipientUserId) {
        return false;
      }
      if (query.status && notification.status !== query.status) {
        return false;
      }
      return true;
    });
  }

  async createNotification(
    input: Omit<NotificationRecord, "id" | "status"> & { status?: NotificationRecord["status"] }
  ) {
    const notification: NotificationRecord = {
      id: `notification_${demoNotifications.length + 1}`,
      status: input.status ?? "QUEUED",
      recipientUserId: input.recipientUserId,
      type: input.type,
      payload: input.payload
    };
    demoNotifications.push(notification);
    return notification;
  }

  async markRead(input: {
    organizationId: string;
    notificationId: string;
    recipientUserId: string;
  }) {
    const notification = demoNotifications.find(
      (candidate) =>
        candidate.id === input.notificationId && candidate.recipientUserId === input.recipientUserId
    );
    if (notification) {
      notification.status = "READ";
      return notification;
    }
    return notFoundNotification(input.notificationId, input.recipientUserId);
  }
}

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  async listNotifications(query: {
    organizationId: string;
    recipientUserId: string;
    status?: NotificationRecord["status"];
  }) {
    const notifications = await prisma.notification.findMany({
      where: {
        recipientUserId: query.recipientUserId,
        ...(query.status ? { status: query.status } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    return notifications.map(mapNotification);
  }

  async createNotification(
    input: Omit<NotificationRecord, "id" | "status"> & { status?: NotificationRecord["status"] }
  ) {
    const notification = await prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        channel: "IN_APP",
        type: asNotificationType(input.type),
        status: input.status ?? "QUEUED",
        payload: input.payload
      }
    });
    return mapNotification(notification);
  }

  async markRead(input: {
    organizationId: string;
    notificationId: string;
    recipientUserId: string;
  }) {
    await prisma.notification.updateMany({
      where: {
        id: input.notificationId,
        recipientUserId: input.recipientUserId
      },
      data: { status: "READ" }
    });
    const notification = await prisma.notification.findFirst({
      where: {
        id: input.notificationId,
        recipientUserId: input.recipientUserId
      }
    });
    if (!notification) {
      return notFoundNotification(input.notificationId, input.recipientUserId);
    }
    return mapNotification(notification);
  }
}

@Injectable()
export class NotificationRepositoryProvider {
  constructor(
    @Inject(InMemoryNotificationRepository) private readonly memory: InMemoryNotificationRepository,
    @Inject(PrismaNotificationRepository) private readonly persistent: PrismaNotificationRepository
  ) {}

  repository() {
    return persistenceEnabled() ? this.persistent : this.memory;
  }
}
