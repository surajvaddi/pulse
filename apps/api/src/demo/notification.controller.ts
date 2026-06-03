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

  @Post(":notificationId/read")
  markRead(
    @CurrentSession() session: DemoSession,
    @Param("notificationId") notificationId: string,
    @Body() _body: Record<string, never>
  ) {
    return this.notifications.markRead(session, notificationId);
  }
}
