export type ExternalSyncResult = {
  externalId: string;
  status: "CREATED" | "UPDATED" | "SKIPPED" | "FAILED";
  message?: string;
};

export type WorkforceIntegrationAdapter = {
  pullEmployees(): Promise<unknown[]>;
  pullSchedules(start: Date, end: Date): Promise<unknown[]>;
  pushScheduleChange(change: unknown): Promise<ExternalSyncResult>;
  pullTimecards(start: Date, end: Date): Promise<unknown[]>;
};

