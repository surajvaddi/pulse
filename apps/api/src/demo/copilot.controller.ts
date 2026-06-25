import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { CopilotService } from "./copilot.service";
import { AIToolPreviewService } from "../workflows/ai-tool-preview.service";

@Controller("copilot")
export class CopilotController {
  constructor(
    @Inject(CopilotService) private readonly copilot: CopilotService,
    @Inject(AIToolPreviewService)
    private readonly previews: AIToolPreviewService
  ) {}

  @Post("messages")
  message(@CurrentSession() session: DemoSession, @Body() body: { message?: string }) {
    return this.copilot.handleMessage(session, body.message ?? "");
  }

  @Get("tool-calls")
  toolCalls(@CurrentSession() session: DemoSession) {
    return this.copilot.listToolCalls(session);
  }

  @Post("previews/:id/confirm")
  confirmPreview(
    @CurrentSession() session: DemoSession,
    @Param("id") id: string
  ) {
    return this.previews.confirm(session, id);
  }
}
