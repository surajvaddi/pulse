export type ExternalSyncResult = {
  externalId: string;
  status: "CREATED" | "UPDATED" | "SKIPPED" | "FAILED";
  message?: string;
};

export type IntegrationSystem = "KRONOS" | "UKG" | "PAYROLL_CSV" | "HRIS";

export type IntegrationStatus = "CONNECTED" | "NEEDS_ATTENTION" | "DISABLED";

export type SyncDirection = "IMPORT" | "EXPORT" | "BIDIRECTIONAL";

export type SyncRunStatus = "SUCCEEDED" | "PARTIAL" | "FAILED";

export type IntegrationConnection = {
  id: string;
  system: IntegrationSystem;
  displayName: string;
  status: IntegrationStatus;
  direction: SyncDirection;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  recordTypes: Array<"EMPLOYEE" | "SCHEDULE" | "TIMECARD" | "CREDENTIAL">;
};

export type IntegrationSyncRun = {
  id: string;
  integrationId: string;
  status: SyncRunStatus;
  startedAt: string;
  finishedAt: string;
  imported: number;
  exported: number;
  skipped: number;
  failed: number;
  summary: string;
};

export type CsvPreviewRow = {
  rowNumber: number;
  externalId: string;
  recordType: "EMPLOYEE" | "SCHEDULE" | "TIMECARD";
  status: ExternalSyncResult["status"];
  message: string;
};

export type WorkforceIntegrationAdapter = {
  pullEmployees(): Promise<unknown[]>;
  pullSchedules(start: Date, end: Date): Promise<unknown[]>;
  pushScheduleChange(change: unknown): Promise<ExternalSyncResult>;
  pullTimecards(start: Date, end: Date): Promise<unknown[]>;
};

export type WorkforceEmployeePayload = {
  externalId: string;
  employeeId: string;
  name: string;
  role: string;
  unitId: string;
  active: boolean;
};

export type WorkforceSchedulePayload = {
  externalId: string;
  shiftId: string;
  employeeId?: string;
  unitId: string;
  startsAt: string;
  endsAt: string;
  status: "OPEN" | "PUBLISHED" | "ASSIGNED";
};

export type WorkforceTimecardPayload = {
  externalId: string;
  employeeId: string;
  startsAt: string;
  endsAt: string | null;
  exceptionCode?: string;
};

export function createCsvImportPreview(rows: CsvPreviewRow[]): {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  rows: CsvPreviewRow[];
} {
  return {
    totalRows: rows.length,
    acceptedRows: rows.filter((row) => row.status !== "FAILED").length,
    rejectedRows: rows.filter((row) => row.status === "FAILED").length,
    rows
  };
}

export function createMockWorkforceAdapter(input: {
  employees: WorkforceEmployeePayload[];
  schedules: WorkforceSchedulePayload[];
  timecards: WorkforceTimecardPayload[];
}): WorkforceIntegrationAdapter {
  return {
    async pullEmployees() {
      return input.employees;
    },
    async pullSchedules(start: Date, end: Date) {
      return input.schedules.filter((schedule) => {
        const startsAt = new Date(schedule.startsAt);
        return startsAt >= start && startsAt <= end;
      });
    },
    async pushScheduleChange(change: unknown) {
      const maybeChange = change as { externalId?: string; shiftId?: string };
      return {
        externalId: maybeChange.externalId ?? maybeChange.shiftId ?? "unknown_schedule_change",
        status: "UPDATED",
        message: "Mock adapter accepted the schedule change for downstream export."
      };
    },
    async pullTimecards(start: Date, end: Date) {
      return input.timecards.filter((timecard) => {
        const startsAt = new Date(timecard.startsAt);
        return startsAt >= start && startsAt <= end;
      });
    }
  };
}
