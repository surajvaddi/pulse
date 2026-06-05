import { Inject, Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority
} from "@pulseshift/domain";

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
  organizationId: string;
  recipientUserId: string;
  channel: NotificationChannel;
  type: NotificationType;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "READ";
  category: NotificationCategory;
  priority: NotificationPriority;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
  readAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  retryCount: number;
  lastAttemptedAt: Date | null;
  nextRetryAt: Date | null;
  providerMessageId: string | null;
  providerMetadata: unknown;
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

function optionalIso(date: Date | string | null | undefined) {
  if (!date) {
    return undefined;
  }
  return typeof date === "string" ? date : date.toISOString();
}

function mapProviderMetadata(metadata: unknown): Record<string, string> | undefined {
  const payload = mapPayload(metadata);
  return Object.keys(payload).length ? payload : undefined;
}

function mapNotification(notification: PrismaNotificationRecord): NotificationRecord {
  const record: NotificationRecord = {
    id: notification.id,
    organizationId: notification.organizationId,
    recipientUserId: notification.recipientUserId,
    channel: notification.channel,
    type: notification.type,
    status: notification.status,
    category: notification.category,
    priority: notification.priority,
    payload: mapPayload(notification.payload),
    retryCount: notification.retryCount
  };
  const optionalDates = {
    createdAt: optionalIso(notification.createdAt),
    updatedAt: optionalIso(notification.updatedAt),
    readAt: optionalIso(notification.readAt),
    deliveredAt: optionalIso(notification.deliveredAt),
    failedAt: optionalIso(notification.failedAt),
    lastAttemptedAt: optionalIso(notification.lastAttemptedAt),
    nextRetryAt: optionalIso(notification.nextRetryAt)
  };
  for (const [key, value] of Object.entries(optionalDates)) {
    if (value) {
      record[key as keyof typeof optionalDates] = value;
    }
  }
  if (notification.failureReason) {
    record.failureReason = notification.failureReason;
  }
  if (notification.providerMessageId) {
    record.providerMessageId = notification.providerMessageId;
  }
  const providerMetadata = mapProviderMetadata(notification.providerMetadata);
  if (providerMetadata) {
    record.providerMetadata = providerMetadata;
  }
  return record;
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
    organizationId: "",
    recipientUserId,
    channel: "IN_APP",
    type: "NOT_FOUND",
    status: "READ",
    category: "SYSTEM",
    priority: "NORMAL",
    payload: {},
    retryCount: 0
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
      if (notification.organizationId !== query.organizationId) {
        return false;
      }
      if (notification.recipientUserId !== query.recipientUserId) {
        return false;
      }
      if (query.status && notification.status !== query.status) {
        return false;
      }
      return true;
    });
  }

  async countUnread(query: { organizationId: string; recipientUserId: string }) {
    return demoNotifications.filter(
      (notification) =>
        notification.organizationId === query.organizationId &&
        notification.recipientUserId === query.recipientUserId &&
        notification.status !== "READ"
    ).length;
  }

  async createNotification(
    input: Omit<NotificationRecord, "id" | "status" | "retryCount"> &
      Partial<Pick<NotificationRecord, "status" | "retryCount">>
  ) {
    const now = new Date().toISOString();
    const notification: NotificationRecord = {
      id: `notification_${demoNotifications.length + 1}`,
      status: input.status ?? "QUEUED",
      organizationId: input.organizationId,
      recipientUserId: input.recipientUserId,
      channel: input.channel,
      type: input.type,
      category: input.category,
      priority: input.priority,
      payload: input.payload,
      retryCount: input.retryCount ?? 0,
      createdAt: now,
      updatedAt: now
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
        candidate.organizationId === input.organizationId &&
        candidate.id === input.notificationId && candidate.recipientUserId === input.recipientUserId
    );
    if (notification) {
      notification.status = "READ";
      notification.readAt = new Date().toISOString();
      notification.updatedAt = notification.readAt;
      return notification;
    }
    return notFoundNotification(input.notificationId, input.recipientUserId);
  }

  async updateDeliveryStatus(input: {
    organizationId: string;
    notificationId: string;
    recipientUserId: string;
    status: Extract<NotificationRecord["status"], "SENT" | "DELIVERED" | "FAILED">;
    failureReason?: string;
    providerMessageId?: string;
    providerMetadata?: Record<string, string>;
    nextRetryAt?: string;
  }) {
    const notification = demoNotifications.find(
      (candidate) =>
        candidate.organizationId === input.organizationId &&
        candidate.id === input.notificationId &&
        candidate.recipientUserId === input.recipientUserId
    );
    if (!notification) {
      return notFoundNotification(input.notificationId, input.recipientUserId);
    }
    const now = new Date().toISOString();
    notification.status = input.status;
    notification.updatedAt = now;
    notification.lastAttemptedAt = now;
    if (input.providerMessageId) {
      notification.providerMessageId = input.providerMessageId;
    } else {
      delete notification.providerMessageId;
    }
    if (input.providerMetadata) {
      notification.providerMetadata = input.providerMetadata;
    } else {
      delete notification.providerMetadata;
    }
    if (input.status === "DELIVERED") {
      notification.deliveredAt = now;
      delete notification.failureReason;
      delete notification.nextRetryAt;
    }
    if (input.status === "FAILED") {
      notification.failedAt = now;
      if (input.failureReason) {
        notification.failureReason = input.failureReason;
      }
      if (input.nextRetryAt) {
        notification.nextRetryAt = input.nextRetryAt;
      }
      notification.retryCount += 1;
    }
    return notification;
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
        organizationId: query.organizationId,
        recipientUserId: query.recipientUserId,
        ...(query.status ? { status: query.status } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    return notifications.map(mapNotification);
  }

  async countUnread(query: { organizationId: string; recipientUserId: string }) {
    return prisma.notification.count({
      where: {
        organizationId: query.organizationId,
        recipientUserId: query.recipientUserId,
        status: { not: "READ" }
      }
    });
  }

  async createNotification(
    input: Omit<NotificationRecord, "id" | "status" | "retryCount"> &
      Partial<Pick<NotificationRecord, "status" | "retryCount">>
  ) {
    const notification = await prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        recipientUserId: input.recipientUserId,
        channel: input.channel,
        type: asNotificationType(input.type),
        category: input.category,
        priority: input.priority,
        status: input.status ?? "QUEUED",
        payload: input.payload,
        retryCount: input.retryCount ?? 0
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
        organizationId: input.organizationId,
        id: input.notificationId,
        recipientUserId: input.recipientUserId
      },
      data: { status: "READ", readAt: new Date() }
    });
    const notification = await prisma.notification.findFirst({
      where: {
        organizationId: input.organizationId,
        id: input.notificationId,
        recipientUserId: input.recipientUserId
      }
    });
    if (!notification) {
      return notFoundNotification(input.notificationId, input.recipientUserId);
    }
    return mapNotification(notification);
  }

  async updateDeliveryStatus(input: {
    organizationId: string;
    notificationId: string;
    recipientUserId: string;
    status: Extract<NotificationRecord["status"], "SENT" | "DELIVERED" | "FAILED">;
    failureReason?: string;
    providerMessageId?: string;
    providerMetadata?: Record<string, string>;
    nextRetryAt?: string;
  }) {
    const now = new Date();
    const data = {
      status: input.status,
      lastAttemptedAt: now,
      ...(input.providerMessageId ? { providerMessageId: input.providerMessageId } : {}),
      ...(input.providerMetadata ? { providerMetadata: input.providerMetadata } : {}),
      ...(input.status === "DELIVERED"
        ? { deliveredAt: now, failureReason: null, nextRetryAt: null }
        : {}),
      ...(input.status === "FAILED"
        ? {
            failedAt: now,
            ...(input.failureReason ? { failureReason: input.failureReason } : {}),
            nextRetryAt: input.nextRetryAt ? new Date(input.nextRetryAt) : null,
            retryCount: { increment: 1 }
          }
        : {})
    };
    await prisma.notification.updateMany({
      where: {
        organizationId: input.organizationId,
        id: input.notificationId,
        recipientUserId: input.recipientUserId
      },
      data
    });
    const notification = await prisma.notification.findFirst({
      where: {
        organizationId: input.organizationId,
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
