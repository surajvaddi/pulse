import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  NotificationCategorySchema,
  NotificationChannelSchema,
  RoleNotificationPreferenceDefaults,
  type NotificationCategory,
  type NotificationPriority
} from "@pulseshift/domain";

import type { DemoSession } from "../auth/demo-users";
import {
  NotificationPreferenceRepositoryProvider,
  NotificationRepositoryProvider
} from "./notification.repository";

@Injectable()
export class NotificationService {
  constructor(
    @Inject(NotificationRepositoryProvider) private readonly repositories: NotificationRepositoryProvider,
    @Inject(NotificationPreferenceRepositoryProvider)
    private readonly preferenceRepositories: NotificationPreferenceRepositoryProvider
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

  async summaryForSession(session: DemoSession) {
    const [notifications, unreadCount] = await Promise.all([
      this.listForSession(session),
      this.unreadCountForSession(session)
    ]);

    return {
      unreadCount,
      recent: notifications.slice(0, 3)
    };
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

  async listPreferences(session: DemoSession) {
    return this.preferenceRepositories.repository().ensureDefaults({
      organizationId: session.organizationId,
      userId: session.userId,
      roles: [session.role]
    });
  }

  async updatePreference(
    session: DemoSession,
    input: {
      category: unknown;
      channel: unknown;
      enabled: unknown;
    }
  ) {
    if (session.role === "AI_AGENT_SERVICE") {
      throw new ForbiddenException("AI service notification preferences are backend controlled");
    }

    const category = NotificationCategorySchema.parse(input.category);
    const channel = NotificationChannelSchema.parse(input.channel);
    if (typeof input.enabled !== "boolean") {
      throw new BadRequestException("Notification preference enabled must be a boolean");
    }

    const defaultPreference = RoleNotificationPreferenceDefaults[session.role].find(
      (preference) => preference.category === category && preference.channel === channel
    );
    if (!defaultPreference) {
      throw new ForbiddenException("This notification channel is not available for the current role");
    }
    if (defaultPreference.required && !input.enabled) {
      throw new BadRequestException("Required notification preferences cannot be disabled");
    }

    await this.listPreferences(session);
    return this.preferenceRepositories.repository().upsertPreference({
      organizationId: session.organizationId,
      userId: session.userId,
      role: session.role,
      category,
      channel,
      enabled: input.enabled,
      required: defaultPreference.required,
      priority: defaultPreference.priority
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
