import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { CopilotController } from "./copilot.controller";
import { CopilotService } from "./copilot.service";
import { DemoController } from "./demo.controller";
import { NotificationController } from "./notification.controller";
import { PolicyEngineService } from "./policy-engine.service";
import { SchedulingWorkflowController } from "./scheduling-workflow.controller";
import { SchedulingWorkflowService } from "./scheduling-workflow.service";

@Module({
  imports: [AuthModule],
  controllers: [DemoController, SchedulingWorkflowController, NotificationController, CopilotController],
  providers: [SchedulingWorkflowService, PolicyEngineService, CopilotService]
})
export class DemoModule {}
