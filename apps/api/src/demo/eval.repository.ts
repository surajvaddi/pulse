import { Inject, Injectable } from "@nestjs/common";
import { Prisma, prisma } from "@pulseshift/db";
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
export class PrismaEvalRepository implements EvalRepository {
  async listCopilotRuns(query: { organizationId: string; limit?: number }) {
    const records = await prisma.evaluationRunRecord.findMany({
      where: { organizationId: query.organizationId },
      orderBy: { createdAt: "desc" },
      ...(query.limit ? { take: query.limit } : {})
    });
    return records.map(
      (record) => record.payload as unknown as CopilotEvalRun
    );
  }

  async appendCopilotRun(input: CopilotEvalRun & { organizationId: string }) {
    const { organizationId, ...run } = input;
    await prisma.evaluationRunRecord.create({
      data: {
        id: run.id,
        organizationId,
        payload: run as unknown as Prisma.InputJsonValue,
        createdAt: new Date(run.createdAt)
      }
    });
    return run;
  }
}

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
