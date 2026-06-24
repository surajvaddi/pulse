import { Inject, Injectable } from "@nestjs/common";
import { Prisma, prisma } from "@pulseshift/db";
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
export class PrismaIntegrationRepository implements IntegrationRepository {
  async listConnections(query: { organizationId: string }) {
    const records = await prisma.integrationConnectionRecord.findMany({
      where: { organizationId: query.organizationId },
      orderBy: { createdAt: "asc" }
    });
    return records.map(
      (record) => record.payload as unknown as IntegrationConnection
    );
  }

  async listSyncRuns(query: { organizationId: string; integrationId: string }) {
    const records = await prisma.integrationSyncRunRecord.findMany({
      where: {
        organizationId: query.organizationId,
        integrationId: query.integrationId
      },
      orderBy: { startedAt: "desc" }
    });
    return records.map(
      (record) => record.payload as unknown as IntegrationSyncRun
    );
  }

  async previewImport(query: { organizationId: string; integrationId: string }) {
    const record = await prisma.integrationImportPreviewRecord.findFirst({
      where: {
        organizationId: query.organizationId,
        integrationId: query.integrationId
      },
      orderBy: { createdAt: "desc" }
    });
    if (!record) {
      return {
        integrationId: query.integrationId,
        totalRows: 0,
        acceptedRows: 0,
        rejectedRows: 0,
        rows: []
      };
    }
    return record.payload as unknown as {
      integrationId: string;
      totalRows: number;
      acceptedRows: number;
      rejectedRows: number;
      rows: CsvPreviewRow[];
    };
  }

  async appendSyncRun(input: IntegrationSyncRun & { organizationId: string }) {
    const connection = await prisma.integrationConnectionRecord.findFirst({
      where: { id: input.integrationId, organizationId: input.organizationId }
    });
    if (!connection) {
      throw new Error("Integration connection not found in this organization.");
    }
    const { organizationId, ...run } = input;
    await prisma.integrationSyncRunRecord.create({
      data: {
        id: run.id,
        organizationId,
        integrationId: run.integrationId,
        payload: run as unknown as Prisma.InputJsonValue,
        startedAt: new Date(run.startedAt)
      }
    });
    const connectionPayload =
      connection.payload as unknown as IntegrationConnection;
    await prisma.integrationConnectionRecord.update({
      where: { id: connection.id },
      data: {
        payload: {
          ...connectionPayload,
          lastSyncAt: run.finishedAt
        } as unknown as Prisma.InputJsonValue
      }
    });
    return run;
  }
}

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
