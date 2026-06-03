import { Inject, Injectable } from "@nestjs/common";
import {
  createCsvImportPreview,
  type CsvPreviewRow,
  type IntegrationConnection,
  type IntegrationSyncRun
} from "@pulseshift/integrations";

import {
  demoCsvImportRows,
  demoIntegrationConnections,
  demoIntegrationSyncRuns
} from "./demo-data";
import type { IntegrationRepository } from "../workflows/repository-contracts";

function persistenceEnabled() {
  return process.env.WORKFLOW_PERSISTENCE === "prisma";
}

@Injectable()
export class InMemoryIntegrationRepository implements IntegrationRepository {
  async listConnections(_query: { organizationId: string }) {
    return demoIntegrationConnections as IntegrationConnection[];
  }

  async listSyncRuns(query: { organizationId: string; integrationId: string }) {
    return demoIntegrationSyncRuns
      .filter((run) => run.integrationId === query.integrationId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt)) as IntegrationSyncRun[];
  }

  async previewImport(query: { organizationId: string; integrationId: string }) {
    return {
      integrationId: query.integrationId,
      ...createCsvImportPreview(demoCsvImportRows as CsvPreviewRow[])
    };
  }

  async appendSyncRun(input: IntegrationSyncRun & { organizationId: string }) {
    const run: IntegrationSyncRun = {
      id: input.id,
      integrationId: input.integrationId,
      status: input.status,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      imported: input.imported,
      exported: input.exported,
      skipped: input.skipped,
      failed: input.failed,
      summary: input.summary
    };
    demoIntegrationSyncRuns.push(run);
    const integration = demoIntegrationConnections.find((candidate) => candidate.id === input.integrationId);
    if (integration) {
      integration.lastSyncAt = run.finishedAt;
    }
    return run;
  }
}

@Injectable()
export class PrismaIntegrationRepository extends InMemoryIntegrationRepository {}

@Injectable()
export class IntegrationRepositoryProvider {
  constructor(
    @Inject(InMemoryIntegrationRepository) private readonly memory: InMemoryIntegrationRepository,
    @Inject(PrismaIntegrationRepository) private readonly persistent: PrismaIntegrationRepository
  ) {}

  repository() {
    return persistenceEnabled() ? this.persistent : this.memory;
  }
}
