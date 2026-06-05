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
import {
  EvalRepositoryProvider,
  InMemoryEvalRepository,
  PrismaEvalRepository
} from "./eval.repository";
import { EvalService } from "./eval.service";
import { IntegrationController } from "./integration.controller";
import {
  InMemoryIntegrationRepository,
  IntegrationRepositoryProvider,
  PrismaIntegrationRepository
} from "./integration.repository";
import { IntegrationService } from "./integration.service";
import {
  InMemoryNotificationPreferenceRepository,
  InMemoryNotificationRepository,
  NotificationPreferenceRepositoryProvider,
  NotificationRepositoryProvider,
  PrismaNotificationPreferenceRepository,
  PrismaNotificationRepository
} from "./notification.repository";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { OperationsController } from "./operations.controller";
import {
  InMemoryOperationsRepository,
  OperationsRepositoryProvider,
  PrismaOperationsRepository
} from "./operations.repository";
import { OperationsService } from "./operations.service";
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
    IntegrationService,
    EvalService,
    AuditService,
    InMemoryAuditRepository,
    PrismaAuditRepository,
    AuditRepositoryProvider,
    InMemoryScheduleRepository,
    PrismaScheduleRepository,
    ScheduleRepositoryProvider,
    ScheduleService,
    NotificationService,
    OperationsService,
    InMemoryNotificationRepository,
    PrismaNotificationRepository,
    NotificationRepositoryProvider,
    InMemoryNotificationPreferenceRepository,
    PrismaNotificationPreferenceRepository,
    NotificationPreferenceRepositoryProvider,
    InMemoryOperationsRepository,
    PrismaOperationsRepository,
    OperationsRepositoryProvider,
    InMemoryIntegrationRepository,
    PrismaIntegrationRepository,
    IntegrationRepositoryProvider,
    InMemoryEvalRepository,
    PrismaEvalRepository,
    EvalRepositoryProvider,
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
