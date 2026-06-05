import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { NotificationService } from "./notification.service";

@Controller("notifications")
export class NotificationController {
  constructor(@Inject(NotificationService) private readonly notifications: NotificationService) {}

  @Get()
  list(@CurrentSession() session: DemoSession) {
    return this.notifications.listForSession(session);
  }

  @Get("summary")
  summary(@CurrentSession() session: DemoSession) {
    return this.notifications.summaryForSession(session);
  }

  @Get("preferences")
  preferences(@CurrentSession() session: DemoSession) {
    return this.notifications.listPreferences(session);
  }

  @Post("preferences")
  updatePreference(
    @CurrentSession() session: DemoSession,
    @Body() body: { category?: unknown; channel?: unknown; enabled?: unknown }
  ) {
    return this.notifications.updatePreference(session, {
      category: body.category,
      channel: body.channel,
      enabled: body.enabled
    });
  }

  @Post(":notificationId/read")
  markRead(
    @CurrentSession() session: DemoSession,
    @Param("notificationId") notificationId: string,
    @Body() _body: Record<string, never>
  ) {
    return this.notifications.markRead(session, notificationId);
  }
}
