import { Body, Controller, Get, Inject, Post } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { CopilotService } from "./copilot.service";

@Controller("copilot")
export class CopilotController {
  constructor(@Inject(CopilotService) private readonly copilot: CopilotService) {}

  @Post("messages")
  message(@CurrentSession() session: DemoSession, @Body() body: { message?: string }) {
    return this.copilot.handleMessage(session, body.message ?? "");
  }

  @Get("tool-calls")
  toolCalls(@CurrentSession() session: DemoSession) {
    return this.copilot.listToolCalls(session);
  }
}
