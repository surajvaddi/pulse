import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DemoController } from "./demo.controller";
import { PolicyEngineService } from "./policy-engine.service";
import { SchedulingWorkflowController } from "./scheduling-workflow.controller";
import { SchedulingWorkflowService } from "./scheduling-workflow.service";

@Module({
  imports: [AuthModule],
  controllers: [DemoController, SchedulingWorkflowController],
  providers: [SchedulingWorkflowService, PolicyEngineService]
})
export class DemoModule {}
