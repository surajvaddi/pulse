import { Inject, Injectable } from "@nestjs/common";
import { copilotEvalTasks, createCopilotEvalRun, type CopilotEvalResponse } from "@pulseshift/evals";

import { findDemoSession } from "../auth/demo-users";
import { CopilotService } from "./copilot.service";
import { EvalRepositoryProvider } from "./eval.repository";

@Injectable()
export class EvalService {
  constructor(
    @Inject(CopilotService) private readonly copilot: CopilotService,
    @Inject(EvalRepositoryProvider) private readonly repositories: EvalRepositoryProvider
  ) {}

  tasks() {
    return copilotEvalTasks;
  }

  runs(organizationId: string) {
    return this.repositories.repository().listCopilotRuns({ organizationId });
  }

  async runCopilotEval(organizationId: string) {
    const responses: Record<string, CopilotEvalResponse> = {};
    for (const task of copilotEvalTasks) {
      const session = findDemoSession(task.actorUserId);
      responses[task.id] = (await this.copilot.handleMessage(session, task.prompt)) as CopilotEvalResponse;
    }

    const run = createCopilotEvalRun({
      id: `eval_run_${Date.now()}`,
      createdAt: new Date().toISOString(),
      tasks: copilotEvalTasks,
      responses
    });
    return this.repositories.repository().appendCopilotRun({
      organizationId,
      ...run
    });
  }
}
