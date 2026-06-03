import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { CopilotController } from "./copilot.controller";
import { CopilotService } from "./copilot.service";
import { DemoController } from "./demo.controller";
import { EvalController } from "./eval.controller";
import { IntegrationController } from "./integration.controller";
import { NotificationController } from "./notification.controller";
import { OperationsController } from "./operations.controller";
import { PolicyEngineService } from "./policy-engine.service";
import {
  InMemoryScheduleRepository,
  PrismaScheduleRepository,
  ScheduleRepositoryProvider
} from "./schedule.repository";
import { SchedulingWorkflowController } from "./scheduling-workflow.controller";
import { SchedulingWorkflowService } from "./scheduling-workflow.service";
import { TimeclockController } from "./timeclock.controller";
import {
  InMemoryTimeclockRepository,
  PrismaTimeclockRepository,
  TimeclockRepositoryProvider
} from "./timeclock.repository";
import { TimeclockService } from "./timeclock.service";

@Module({
  imports: [AuthModule],
  controllers: [
    DemoController,
    SchedulingWorkflowController,
    NotificationController,
    CopilotController,
    OperationsController,
    IntegrationController,
    EvalController,
    TimeclockController
  ],
  providers: [
    SchedulingWorkflowService,
    PolicyEngineService,
    CopilotService,
    InMemoryScheduleRepository,
    PrismaScheduleRepository,
    ScheduleRepositoryProvider,
    TimeclockService,
    InMemoryTimeclockRepository,
    PrismaTimeclockRepository,
    TimeclockRepositoryProvider
  ]
})
export class DemoModule {}
