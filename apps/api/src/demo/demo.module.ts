import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DemoController } from "./demo.controller";
import { SchedulingWorkflowController } from "./scheduling-workflow.controller";
import { SchedulingWorkflowService } from "./scheduling-workflow.service";

@Module({
  imports: [AuthModule],
  controllers: [DemoController, SchedulingWorkflowController],
  providers: [SchedulingWorkflowService]
})
export class DemoModule {}
