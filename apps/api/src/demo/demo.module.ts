import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import {
  AuditRepositoryProvider,
  InMemoryAuditRepository,
  PrismaAuditRepository
} from "./audit.repository";
import { AuditService } from "./audit.service";
import { CopilotController } from "./copilot.controller";
import { CopilotService } from "./copilot.service";
import { DemoController } from "./demo.controller";
import { EvalController } from "./eval.controller";
import { IntegrationController } from "./integration.controller";
import {
  InMemoryNotificationRepository,
  NotificationRepositoryProvider,
  PrismaNotificationRepository
} from "./notification.repository";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { OperationsController } from "./operations.controller";
import { PolicyEngineService } from "./policy-engine.service";
import {
  InMemoryScheduleRepository,
  PrismaScheduleRepository,
  ScheduleRepositoryProvider
} from "./schedule.repository";
import { ScheduleService } from "./schedule.service";
import { SchedulingWorkflowController } from "./scheduling-workflow.controller";
import { SchedulingWorkflowService } from "./scheduling-workflow.service";
import {
  InMemorySwapRepository,
  PrismaSwapRepository,
  SwapRepositoryProvider
} from "./swap.repository";
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
    AuditService,
    InMemoryAuditRepository,
    PrismaAuditRepository,
    AuditRepositoryProvider,
    InMemoryScheduleRepository,
    PrismaScheduleRepository,
    ScheduleRepositoryProvider,
    ScheduleService,
    NotificationService,
    InMemoryNotificationRepository,
    PrismaNotificationRepository,
    NotificationRepositoryProvider,
    InMemorySwapRepository,
    PrismaSwapRepository,
    SwapRepositoryProvider,
    TimeclockService,
    InMemoryTimeclockRepository,
    PrismaTimeclockRepository,
    TimeclockRepositoryProvider
  ]
})
export class DemoModule {}
