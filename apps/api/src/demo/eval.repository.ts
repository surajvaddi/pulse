import { Inject, Injectable } from "@nestjs/common";
import type { CopilotEvalRun } from "@pulseshift/evals";

import { demoCopilotEvalRuns } from "./demo-data";
import type { EvalRepository } from "../workflows/repository-contracts";

function persistenceEnabled() {
  return process.env.WORKFLOW_PERSISTENCE === "prisma";
}

@Injectable()
export class InMemoryEvalRepository implements EvalRepository {
  async listCopilotRuns(query: { organizationId: string; limit?: number }) {
    return demoCopilotEvalRuns.slice(0, query.limit);
  }

  async appendCopilotRun(input: CopilotEvalRun & { organizationId: string }) {
    const run: CopilotEvalRun = {
      id: input.id,
      createdAt: input.createdAt,
      taskCount: input.taskCount,
      passedCount: input.passedCount,
      failedCount: input.failedCount,
      metrics: input.metrics,
      results: input.results
    };
    demoCopilotEvalRuns.unshift(run);
    return run;
  }
}

@Injectable()
export class PrismaEvalRepository extends InMemoryEvalRepository {}

@Injectable()
export class EvalRepositoryProvider {
  constructor(
    @Inject(InMemoryEvalRepository) private readonly memory: InMemoryEvalRepository,
    @Inject(PrismaEvalRepository) private readonly persistent: PrismaEvalRepository
  ) {}

  repository() {
    return persistenceEnabled() ? this.persistent : this.memory;
  }
}
