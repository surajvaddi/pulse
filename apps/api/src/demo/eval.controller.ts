import { Controller, Get, Inject, Post } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import { EvalService } from "./eval.service";

@Controller("evals")
export class EvalController {
  constructor(@Inject(EvalService) private readonly evals: EvalService) {}

  @Get("copilot/tasks")
  copilotTasks() {
    return this.evals.tasks();
  }

  @Get("copilot/runs")
  copilotRuns(@CurrentSession() session: DemoSession) {
    return this.evals.runs(session.organizationId);
  }

  @Post("copilot/run")
  runCopilotEval(@CurrentSession() session: DemoSession) {
    return this.evals.runCopilotEval(session.organizationId);
  }
}
