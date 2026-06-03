import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { OperationsService } from "./operations.service";

@Controller("operations")
export class OperationsController {
  constructor(@Inject(OperationsService) private readonly operations: OperationsService) {}

  @Get("staffing/gaps")
  staffingGaps(@CurrentSession() session: DemoSession) {
    return this.operations.staffingGaps(session);
  }

  @Get("staffing/gaps/:gapId/candidates")
  coverageCandidates(@CurrentSession() session: DemoSession, @Param("gapId") gapId: string) {
    return this.operations.coverageCandidates(session, gapId);
  }

  @Get("credentials/warnings")
  credentialWarnings(@CurrentSession() session: DemoSession) {
    return this.operations.credentialWarnings(session);
  }

  @Get("staff")
  staffDirectory(@CurrentSession() session: DemoSession) {
    return this.operations.staffDirectory(session);
  }

  @Post("timecards/exceptions/:exceptionId/resolve")
  async resolveTimecard(
    @CurrentSession() session: DemoSession,
    @Param("exceptionId") exceptionId: string,
    @Body() body: { resolution?: string }
  ) {
    return this.operations.resolveTimecard(session, exceptionId, body.resolution);
  }
}
