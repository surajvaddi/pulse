import { Inject, Injectable } from "@nestjs/common";

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

  create(input: {
    organizationId: string;
    recipientUserId: string;
    type: string;
    payload: Record<string, string>;
  }) {
    return this.repositories.repository().createNotification({
      recipientUserId: input.recipientUserId,
      type: input.type,
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
}
