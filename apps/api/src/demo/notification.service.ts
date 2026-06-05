import { Inject, Injectable } from "@nestjs/common";
import type { NotificationCategory, NotificationPriority } from "@pulseshift/domain";

import type { DemoSession } from "../auth/demo-users";
import { NotificationRepositoryProvider } from "./notification.repository";

@Injectable()
export class NotificationService {
  constructor(
    @Inject(NotificationRepositoryProvider) private readonly repositories: NotificationRepositoryProvider
  ) {}

  listForSession(session: DemoSession) {
    return this.repositories.repository().listNotifications({
      organizationId: session.organizationId,
      recipientUserId: session.userId
    });
  }

  unreadCountForSession(session: DemoSession) {
    return this.repositories.repository().countUnread({
      organizationId: session.organizationId,
      recipientUserId: session.userId
    });
  }

  create(input: {
    organizationId: string;
    recipientUserId: string;
    type: string;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    payload: Record<string, string>;
  }) {
    return this.repositories.repository().createNotification({
      organizationId: input.organizationId,
      recipientUserId: input.recipientUserId,
      channel: "IN_APP",
      type: input.type,
      category: input.category ?? "SYSTEM",
      priority: input.priority ?? "NORMAL",
      payload: input.payload
    });
  }

  markRead(session: DemoSession, notificationId: string) {
    return this.repositories.repository().markRead({
      organizationId: session.organizationId,
      notificationId,
      recipientUserId: session.userId
    });
  }

  updateDeliveryStatus(input: {
    organizationId: string;
    notificationId: string;
    recipientUserId: string;
    status: "SENT" | "DELIVERED" | "FAILED";
    failureReason?: string;
    providerMessageId?: string;
    providerMetadata?: Record<string, string>;
    nextRetryAt?: string;
  }) {
    return this.repositories.repository().updateDeliveryStatus(input);
  }
}
