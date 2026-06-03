import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { IntegrationService } from "./integration.service";

@Controller("integrations")
export class IntegrationController {
  constructor(@Inject(IntegrationService) private readonly integrations: IntegrationService) {}

  @Get()
  connections(@CurrentSession() session: DemoSession) {
    return this.integrations.connections(session);
  }

  @Get(":integrationId/sync-runs")
  syncRuns(@CurrentSession() session: DemoSession, @Param("integrationId") integrationId: string) {
    return this.integrations.syncRuns(session, integrationId);
  }

  @Get(":integrationId/import-preview")
  importPreview(@CurrentSession() session: DemoSession, @Param("integrationId") integrationId: string) {
    return this.integrations.importPreview(session, integrationId);
  }

  @Post(":integrationId/sync")
  async runSync(
    @CurrentSession() session: DemoSession,
    @Param("integrationId") integrationId: string,
    @Body() body: { direction?: "IMPORT" | "EXPORT" | "BIDIRECTIONAL" }
  ) {
    return this.integrations.runSync(session, integrationId, body);
  }
}
