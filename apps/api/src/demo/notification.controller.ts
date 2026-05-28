import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { demoNotifications } from "./demo-data";

@Controller("notifications")
export class NotificationController {
  @Get()
  list(@CurrentSession() session: DemoSession) {
    return demoNotifications.filter((notification) => notification.recipientUserId === session.userId);
  }

  @Post(":notificationId/read")
  markRead(
    @CurrentSession() session: DemoSession,
    @Param("notificationId") notificationId: string,
    @Body() _body: Record<string, never>
  ) {
    const notification = demoNotifications.find(
      (candidate) =>
        candidate.id === notificationId && candidate.recipientUserId === session.userId
    );
    if (notification) {
      notification.status = "READ";
    }
    return notification ?? { id: notificationId, status: "NOT_FOUND" };
  }
}
