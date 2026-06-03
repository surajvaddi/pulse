import { Inject, Injectable } from "@nestjs/common";
import {
  createMockWorkforceAdapter,
  type IntegrationSyncRun
} from "@pulseshift/integrations";

import type { DemoSession } from "../auth/demo-users";
import { AuditService } from "./audit.service";
import {
  demoCsvImportRows,
  demoSchedules,
  demoStaffDirectory,
  demoTimecardExceptions
} from "./demo-data";
import { IntegrationRepositoryProvider } from "./integration.repository";

@Injectable()
export class IntegrationService {
  constructor(
    @Inject(IntegrationRepositoryProvider) private readonly repositories: IntegrationRepositoryProvider,
    @Inject(AuditService) private readonly auditLogs: AuditService
  ) {}

  connections(session: DemoSession) {
    return this.repositories.repository().listConnections({
      organizationId: session.organizationId
    });
  }

  syncRuns(session: DemoSession, integrationId: string) {
    return this.repositories.repository().listSyncRuns({
      organizationId: session.organizationId,
      integrationId
    });
  }

  importPreview(session: DemoSession, integrationId: string) {
    return this.repositories.repository().previewImport({
      organizationId: session.organizationId,
      integrationId
    });
  }

  async runSync(
    session: DemoSession,
    integrationId: string,
    body: { direction?: "IMPORT" | "EXPORT" | "BIDIRECTIONAL" }
  ) {
    const integrations = await this.connections(session);
    const integration = integrations.find((candidate) => candidate.id === integrationId);
    if (!integration) {
      return { status: "NOT_FOUND", integrationId };
    }

    const adapter = createMockWorkforceAdapter({
      employees: demoStaffDirectory.map((employee) => ({
        externalId: `KRONOS-${employee.employeeId}`,
        employeeId: employee.employeeId,
        name: employee.name,
        role: employee.role,
        unitId: employee.unitId,
        active: true
      })),
      schedules: demoSchedules.map((shift) => {
        const payload = {
          externalId: `KRONOS-${shift.id}`,
          shiftId: shift.id,
          unitId: shift.unitId,
          startsAt: shift.startsAt,
          endsAt: shift.endsAt,
          status: shift.status
        };
        return shift.employeeId ? { ...payload, employeeId: shift.employeeId } : payload;
      }),
      timecards: demoTimecardExceptions.map((exception) => ({
        externalId: `KRONOS-${exception.id}`,
        employeeId: exception.employeeId,
        startsAt: "2026-05-29T23:17:00.000Z",
        endsAt: null,
        exceptionCode: exception.type
      }))
    });

    const syncStart = new Date();
    const [employees, schedules, timecards] = await Promise.all([
      adapter.pullEmployees(),
      adapter.pullSchedules(new Date("2026-05-28T00:00:00.000Z"), new Date("2026-06-02T00:00:00.000Z")),
      adapter.pullTimecards(new Date("2026-05-28T00:00:00.000Z"), new Date("2026-06-02T00:00:00.000Z"))
    ]);
    const exportResult = await adapter.pushScheduleChange({
      externalId: "KRONOS-shift_open_icu_night",
      shiftId: "shift_open_icu_night"
    });

    const run: IntegrationSyncRun = {
      id: `sync_${Date.now()}`,
      integrationId,
      status: exportResult.status === "FAILED" ? "PARTIAL" : "SUCCEEDED",
      startedAt: syncStart.toISOString(),
      finishedAt: new Date().toISOString(),
      imported: employees.length + schedules.length + timecards.length,
      exported: body.direction === "IMPORT" ? 0 : 1,
      skipped: demoCsvImportRows.filter((row) => row.status === "SKIPPED").length,
      failed: demoCsvImportRows.filter((row) => row.status === "FAILED").length,
      summary: `${integration.displayName} sync reconciled staff, schedules, timecards, and one schedule export.`
    };
    const persistedRun = await this.repositories.repository().appendSyncRun({
      organizationId: session.organizationId,
      ...run
    });

    await this.auditLogs.append({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorType: "INTEGRATION",
      action: "integration.sync_completed",
      objectType: "IntegrationConnection",
      objectId: integrationId,
      reason: body.direction ?? integration.direction,
      after: {
        status: persistedRun.status,
        imported: persistedRun.imported,
        exported: persistedRun.exported,
        failed: persistedRun.failed
      }
    });

    return persistedRun;
  }
}
