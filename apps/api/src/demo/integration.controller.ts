import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import {
  createCsvImportPreview,
  createMockWorkforceAdapter,
  type IntegrationConnection,
  type IntegrationSyncRun
} from "@pulseshift/integrations";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import {
  demoCsvImportRows,
  demoIntegrationConnections,
  demoIntegrationSyncRuns,
  demoSchedules,
  demoStaffDirectory,
  demoTimecardExceptions
} from "./demo-data";
import { AuditService } from "./audit.service";

@Controller("integrations")
export class IntegrationController {
  constructor(@Inject(AuditService) private readonly auditLogs: AuditService) {}

  @Get()
  connections(): IntegrationConnection[] {
    return demoIntegrationConnections as IntegrationConnection[];
  }

  @Get(":integrationId/sync-runs")
  syncRuns(@Param("integrationId") integrationId: string): IntegrationSyncRun[] {
    return demoIntegrationSyncRuns
      .filter((run) => run.integrationId === integrationId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt)) as IntegrationSyncRun[];
  }

  @Get(":integrationId/import-preview")
  importPreview(@Param("integrationId") integrationId: string) {
    return {
      integrationId,
      ...createCsvImportPreview(demoCsvImportRows)
    };
  }

  @Post(":integrationId/sync")
  async runSync(
    @CurrentSession() session: DemoSession,
    @Param("integrationId") integrationId: string,
    @Body() body: { direction?: "IMPORT" | "EXPORT" | "BIDIRECTIONAL" }
  ) {
    const integration = demoIntegrationConnections.find((candidate) => candidate.id === integrationId);
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
      id: `sync_${demoIntegrationSyncRuns.length + 1}`,
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
    demoIntegrationSyncRuns.push(run);
    integration.lastSyncAt = run.finishedAt;

    await this.auditLogs.append({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorType: "INTEGRATION",
      action: "integration.sync_completed",
      objectType: "IntegrationConnection",
      objectId: integrationId,
      reason: body.direction ?? integration.direction,
      after: {
        status: run.status,
        imported: run.imported,
        exported: run.exported,
        failed: run.failed
      }
    });

    return run;
  }
}
