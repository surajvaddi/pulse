import { Controller, Get, Inject, Post } from "@nestjs/common";
import { copilotEvalTasks, createCopilotEvalRun, type CopilotEvalResponse } from "@pulseshift/evals";

import { findDemoSession } from "../auth/demo-users";
import { CopilotService } from "./copilot.service";
import { demoCopilotEvalRuns } from "./demo-data";

@Controller("evals")
export class EvalController {
  constructor(@Inject(CopilotService) private readonly copilot: CopilotService) {}

  @Get("copilot/tasks")
  copilotTasks() {
    return copilotEvalTasks;
  }

  @Get("copilot/runs")
  copilotRuns() {
    return demoCopilotEvalRuns;
  }

  @Post("copilot/run")
  runCopilotEval() {
    const responses: Record<string, CopilotEvalResponse> = {};
    for (const task of copilotEvalTasks) {
      const session = findDemoSession(task.actorUserId);
      responses[task.id] = this.copilot.handleMessage(session, task.prompt) as CopilotEvalResponse;
    }

    const run = createCopilotEvalRun({
      id: `eval_run_${demoCopilotEvalRuns.length + 1}`,
      createdAt: new Date().toISOString(),
      tasks: copilotEvalTasks,
      responses
    });
    demoCopilotEvalRuns.unshift(run);
    return run;
  }
}
