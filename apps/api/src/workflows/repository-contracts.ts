import type { CopilotEvalRun } from "@pulseshift/evals";
import type { CsvPreviewRow, IntegrationConnection, IntegrationSyncRun } from "@pulseshift/integrations";
import type {
  AccountRole,
  NotificationCategory,
  NotificationChannel,
  NotificationPreference,
  NotificationPriority,
  Permission,
  Scope
} from "@pulseshift/domain";

import type {
  DemoApprovalRecord,
  DemoAuditLogRecord,
  DemoShiftRecord,
  DemoSwapRecord,
  DemoTimecardEventRecord
} from "../demo/demo-data";
import type { TimeclockCurrentShift, TimeclockEventInput } from "../demo/timeclock.repository";

export type WorkflowActor = {
  userId: string;
  organizationId: string;
  permissions: Permission[];
  scopes: Scope[];
};

export type WorkflowPage<T> = {
  items: T[];
  nextCursor?: string;
};

export type ScheduleQuery = {
  organizationId: string;
  userId?: string;
  employeeId?: string;
  unitId?: string;
  facilityId?: string;
  startsAt?: string;
  endsAt?: string;
  statuses?: DemoShiftRecord["status"][];
};

export interface ScheduleRepository {
  findShift(query: { organizationId: string; shiftId: string }): Promise<DemoShiftRecord | null>;
  findMySchedule(query: Required<Pick<ScheduleQuery, "organizationId" | "employeeId">>): Promise<DemoShiftRecord[]>;
  findUnitSchedule(query: Required<Pick<ScheduleQuery, "organizationId" | "unitId">>): Promise<DemoShiftRecord[]>;
  findFacilitySchedule(query: Required<Pick<ScheduleQuery, "organizationId" | "facilityId">>): Promise<DemoShiftRecord[]>;
  findOrganizationSchedule(query: Pick<ScheduleQuery, "organizationId">): Promise<DemoShiftRecord[]>;
  findOpenShifts(query: Pick<ScheduleQuery, "organizationId" | "unitId" | "facilityId">): Promise<DemoShiftRecord[]>;
  assignShift(input: {
    organizationId: string;
    shiftId: string;
    employeeId: string;
    userId: string;
    status: "ASSIGNED" | "PUBLISHED";
  }): Promise<DemoShiftRecord>;
}

export interface SwapRepository {
  listSwaps(query: {
    organizationId: string;
    requesterUserId?: string;
    proposedUserId?: string;
    unitId?: string;
    statuses?: DemoSwapRecord["status"][];
  }): Promise<DemoSwapRecord[]>;
  findSwap(organizationId: string, swapId: string): Promise<DemoSwapRecord | null>;
  createSwap(input: Omit<DemoSwapRecord, "id">): Promise<DemoSwapRecord>;
  acceptSwap(input: {
    organizationId: string;
    swapId: string;
  }): Promise<DemoSwapRecord>;
  declineSwap(input: { organizationId: string; swapId: string }): Promise<DemoSwapRecord>;
  approveSwap(input: { organizationId: string; swapId: string }): Promise<DemoSwapRecord>;
  denySwap(input: { organizationId: string; swapId: string }): Promise<DemoSwapRecord>;
  approveSwapAndAssignShift(input: {
    organizationId: string;
    swapId: string;
    shiftId: string;
    employeeId: string;
    userId: string;
    status: "ASSIGNED" | "PUBLISHED";
    approvalId?: string;
    decisionReason?: string;
    injectFailureAfterSwapUpdate?: boolean;
  }): Promise<{ swap: DemoSwapRecord; shift: DemoShiftRecord }>;
}

export interface ApprovalRepository {
  findApprovalByTarget(input: {
    organizationId: string;
    targetObjectType: string;
    targetObjectId: string;
  }): Promise<DemoApprovalRecord | null>;
  createApproval(input: Omit<DemoApprovalRecord, "id">): Promise<DemoApprovalRecord>;
  decideApproval(input: {
    organizationId: string;
    approvalId: string;
    status: "APPROVED" | "DENIED";
    decisionReason?: string;
  }): Promise<DemoApprovalRecord>;
}

export type NotificationRecord = {
  id: string;
  recipientUserId: string;
  type: string;
  status: "QUEUED" | "READ";
  payload: Record<string, string>;
};

export interface NotificationRepository {
  listNotifications(query: {
    organizationId: string;
    recipientUserId: string;
    status?: NotificationRecord["status"];
  }): Promise<NotificationRecord[]>;
  createNotification(input: Omit<NotificationRecord, "id" | "status"> & { status?: NotificationRecord["status"] }): Promise<NotificationRecord>;
  markRead(input: {
    organizationId: string;
    notificationId: string;
    recipientUserId: string;
  }): Promise<NotificationRecord>;
}

export type NotificationPreferenceRecord = NotificationPreference & {
  id: string;
};

export interface NotificationPreferenceRepository {
  listPreferences(query: {
    organizationId: string;
    userId: string;
  }): Promise<NotificationPreferenceRecord[]>;
  upsertPreference(input: {
    organizationId: string;
    userId: string;
    role: AccountRole;
    category: NotificationCategory;
    channel: NotificationChannel;
    enabled: boolean;
    required: boolean;
    priority: NotificationPriority;
  }): Promise<NotificationPreferenceRecord>;
  ensureDefaults(input: {
    organizationId: string;
    userId: string;
    roles: AccountRole[];
  }): Promise<NotificationPreferenceRecord[]>;
}

export type AuditLogInput = Omit<DemoAuditLogRecord, "id" | "createdAt" | "organizationId"> & {
  organizationId: string;
};

export interface AuditRepository {
  append(input: AuditLogInput): Promise<DemoAuditLogRecord>;
  list(query: {
    organizationId: string;
    actorUserId?: string;
    action?: string;
    startsAt?: string;
    endsAt?: string;
    limit?: number;
  }): Promise<DemoAuditLogRecord[]>;
}

export type StaffingGapRecord = {
  id: string;
  unitId: string;
  role: string;
  requiredCount: number;
  assignedCount: number;
  gapCount: number;
  severity: string;
  recommendedActions: string[];
};

export type CoverageCandidateRecord = {
  employeeId: string;
  name: string;
  role: string;
  eligibility: string;
  availability: string;
  overtimeRisk: string;
};

export type StaffDirectoryRecord = CoverageCandidateRecord & {
  unitId?: string;
  certifications?: string[];
};

export type CredentialWarningRecord = {
  employeeId: string;
  employeeName: string;
  certification: string;
  status: string;
  expiresAt: string | null;
};

export type TimecardExceptionRecord = {
  id: string;
  employeeId: string;
  userId: string;
  unitId: string;
  type: string;
  severity: string;
  status: string;
  explanation: string;
};

export interface OperationsRepository {
  listStaffingGaps(query: { organizationId: string; unitId?: string }): Promise<StaffingGapRecord[]>;
  listCoverageCandidates(query: { organizationId: string; gapId: string }): Promise<CoverageCandidateRecord[]>;
  listCredentialWarnings(query: { organizationId: string; unitId?: string }): Promise<CredentialWarningRecord[]>;
  listStaff(query: { organizationId: string; unitId?: string; limitedView?: boolean }): Promise<StaffDirectoryRecord[]>;
  listTimecardExceptions(query: {
    organizationId: string;
    userId?: string;
    unitId?: string;
    status?: string;
  }): Promise<TimecardExceptionRecord[]>;
  resolveTimecardException(input: {
    organizationId: string;
    exceptionId: string;
    resolution: string;
  }): Promise<TimecardExceptionRecord>;
}

export interface TimecardRepository {
  employeeIdForUser(userId: string): Promise<string | undefined>;
  eventsForEmployee(employeeId: string, userId: string): Promise<DemoTimecardEventRecord[]>;
  currentShiftForEmployee(employeeId: string, userId: string): Promise<TimeclockCurrentShift>;
  recordEvent(input: TimeclockEventInput): Promise<DemoTimecardEventRecord>;
}

export interface IntegrationRepository {
  listConnections(query: { organizationId: string }): Promise<IntegrationConnection[]>;
  listSyncRuns(query: { organizationId: string; integrationId: string }): Promise<IntegrationSyncRun[]>;
  previewImport(query: { organizationId: string; integrationId: string }): Promise<{
    integrationId: string;
    totalRows: number;
    acceptedRows: number;
    rejectedRows: number;
    rows: CsvPreviewRow[];
  }>;
  appendSyncRun(input: IntegrationSyncRun & { organizationId: string }): Promise<IntegrationSyncRun>;
}

export interface EvalRepository {
  listCopilotRuns(query: { organizationId: string; limit?: number }): Promise<CopilotEvalRun[]>;
  appendCopilotRun(input: CopilotEvalRun & { organizationId: string }): Promise<CopilotEvalRun>;
}

export type SqlReportName =
  | "get_staffing_gaps_report"
  | "get_employee_schedule_report"
  | "get_timecard_exceptions_report"
  | "get_credential_expiry_report"
  | "get_audit_activity_report";

export type SqlReportContext = {
  organizationId: string;
  actorUserId: string;
  permissions: Permission[];
  scopes: Scope[];
  limit: number;
  timeoutMs: number;
};

export type SqlReportDefinition<TParams extends Record<string, unknown>, TResult> = {
  name: SqlReportName;
  requiredPermission: Permission;
  maxRows: number;
  timeoutMs: number;
  validateParams(params: unknown): TParams;
  run(context: SqlReportContext, params: TParams): Promise<TResult[]>;
};

export interface SqlReportingRepository {
  listReports(): SqlReportName[];
  runReport<TParams extends Record<string, unknown>, TResult>(
    name: SqlReportName,
    context: SqlReportContext,
    params: TParams
  ): Promise<TResult[]>;
}
