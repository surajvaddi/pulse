import type { CsvPreviewRow, IntegrationConnection, IntegrationSyncRun } from "@pulseshift/integrations";
import type { CopilotEvalRun } from "@pulseshift/evals";

export const demoEmployeeByUserId = new Map<string, string>([
  ["user_priya", "emp_priya"],
  ["user_maya", "emp_maya"],
  ["user_olivia_charge", "emp_olivia"],
  ["user_aria_agency", "emp_aria"]
]);

export type DemoShiftRecord = {
  id: string;
  employeeId?: string;
  userId?: string;
  unitId: string;
  facilityId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: "OPEN" | "PUBLISHED" | "ASSIGNED";
  riskFlags?: string[];
};

export type DemoSwapRecord = {
  id: string;
  requesterEmployeeId: string;
  requesterUserId: string;
  originalShiftId: string;
  proposedEmployeeId: string;
  proposedUserId: string;
  unitId: string;
  status: "PENDING_COUNTERPARTY" | "PENDING_MANAGER" | "APPROVED" | "DENIED" | "CANCELLED";
  riskFlags: string[];
  managerApprovalRequired: boolean;
  timeline: string[];
};

export type DemoApprovalRecord = {
  id: string;
  approvalType: "SHIFT_SWAP" | "SHIFT_ASSIGNMENT";
  requestedByUserId: string;
  approverUserId?: string;
  targetObjectType: string;
  targetObjectId: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  riskFlags: string[];
  decisionReason?: string;
};

export const demoSchedules: DemoShiftRecord[] = [
  {
    id: "shift_priya_friday_icu_night",
    employeeId: "emp_priya",
    userId: "user_priya",
    unitId: "unit_icu",
    facilityId: "fac_mercy_main",
    title: "ICU RN Night",
    startsAt: "2026-05-29T23:00:00.000Z",
    endsAt: "2026-05-30T11:00:00.000Z",
    status: "PUBLISHED"
  },
  {
    id: "shift_maya_saturday_icu_day",
    employeeId: "emp_maya",
    userId: "user_maya",
    unitId: "unit_icu",
    facilityId: "fac_mercy_main",
    title: "ICU RN Day",
    startsAt: "2026-05-30T12:00:00.000Z",
    endsAt: "2026-05-31T00:00:00.000Z",
    status: "PUBLISHED"
  },
  {
    id: "shift_open_icu_night",
    unitId: "unit_icu",
    facilityId: "fac_mercy_main",
    title: "ICU RN Night Open",
    startsAt: "2026-05-31T23:00:00.000Z",
    endsAt: "2026-06-01T11:00:00.000Z",
    status: "OPEN",
    riskFlags: ["STAFFING_GAP"]
  },
  {
    id: "shift_priya_week2_icu_day",
    employeeId: "emp_priya",
    userId: "user_priya",
    unitId: "unit_icu",
    facilityId: "fac_mercy_main",
    title: "ICU RN Day",
    startsAt: "2026-06-08T11:00:00.000Z",
    endsAt: "2026-06-08T23:00:00.000Z",
    status: "ASSIGNED"
  },
  {
    id: "shift_maya_week2_ed_evening",
    employeeId: "emp_maya",
    userId: "user_maya",
    unitId: "unit_ed",
    facilityId: "fac_mercy_main",
    title: "ED RN Evening",
    startsAt: "2026-06-09T19:00:00.000Z",
    endsAt: "2026-06-10T07:00:00.000Z",
    status: "ASSIGNED"
  },
  {
    id: "shift_olivia_charge_icu",
    employeeId: "emp_olivia",
    userId: "user_olivia_charge",
    unitId: "unit_icu",
    facilityId: "fac_mercy_main",
    title: "ICU Charge Nurse",
    startsAt: "2026-06-10T11:00:00.000Z",
    endsAt: "2026-06-10T23:00:00.000Z",
    status: "PUBLISHED",
    riskFlags: ["MANAGER_APPROVAL_REQUIRED"]
  },
  {
    id: "shift_aria_agency_icu",
    employeeId: "emp_aria",
    userId: "user_aria_agency",
    unitId: "unit_icu",
    facilityId: "fac_mercy_main",
    title: "Agency ICU RN",
    startsAt: "2026-06-11T23:00:00.000Z",
    endsAt: "2026-06-12T11:00:00.000Z",
    status: "ASSIGNED"
  },
  {
    id: "shift_open_ed_day_week2",
    unitId: "unit_ed",
    facilityId: "fac_mercy_main",
    title: "ED RN Day Open",
    startsAt: "2026-06-12T11:00:00.000Z",
    endsAt: "2026-06-12T23:00:00.000Z",
    status: "OPEN",
    riskFlags: ["REST_PERIOD_RISK"]
  },
  {
    id: "shift_open_icu_week3",
    unitId: "unit_icu",
    facilityId: "fac_mercy_main",
    title: "ICU RN Weekend Open",
    startsAt: "2026-06-20T23:00:00.000Z",
    endsAt: "2026-06-21T11:00:00.000Z",
    status: "OPEN",
    riskFlags: ["OVERTIME_RISK", "STAFFING_GAP"]
  }
];

export const demoSwaps: DemoSwapRecord[] = [];

export const demoApprovals: DemoApprovalRecord[] = [];

export const demoTimecardExceptions = [
  {
    id: "timecard_exception_late_priya",
    employeeId: "emp_priya",
    userId: "user_priya",
    unitId: "unit_icu",
    type: "LATE_CLOCK_IN",
    severity: "MEDIUM",
    status: "OPEN",
    explanation: "Priya clocked in 17 minutes after the scheduled ICU night shift start."
  },
  {
    id: "timecard_exception_missed_break_maya",
    employeeId: "emp_maya",
    userId: "user_maya",
    unitId: "unit_ed",
    type: "MISSED_BREAK",
    severity: "LOW",
    status: "OPEN",
    explanation: "Maya has no recorded break during a 12-hour ED evening shift."
  },
  {
    id: "timecard_exception_agency_unscheduled",
    employeeId: "emp_aria",
    userId: "user_aria_agency",
    unitId: "unit_icu",
    type: "UNSCHEDULED_CLOCK_IN",
    severity: "HIGH",
    status: "OPEN",
    explanation: "Agency worker clocked in before the imported assignment was confirmed."
  }
];

export type DemoTimecardEventRecord = {
  id: string;
  employeeId: string;
  userId: string;
  shiftId?: string;
  eventType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";
  occurredAt: string;
  source: "MOBILE" | "BADGE" | "KIOSK" | "IMPORT" | "MANUAL";
  status: "NORMAL" | "FLAGGED" | "CORRECTED" | "VOIDED";
};

export const demoTimecardEvents: DemoTimecardEventRecord[] = [
  {
    id: "timecard_event_priya_late_clock_in",
    employeeId: "emp_priya",
    userId: "user_priya",
    shiftId: "shift_priya_friday_icu_night",
    eventType: "CLOCK_IN",
    occurredAt: "2026-05-29T23:17:00.000Z",
    source: "MOBILE",
    status: "FLAGGED"
  },
  {
    id: "timecard_event_priya_clock_out",
    employeeId: "emp_priya",
    userId: "user_priya",
    shiftId: "shift_priya_friday_icu_night",
    eventType: "CLOCK_OUT",
    occurredAt: "2026-05-30T11:03:00.000Z",
    source: "MOBILE",
    status: "NORMAL"
  },
  {
    id: "timecard_event_maya_clock_in",
    employeeId: "emp_maya",
    userId: "user_maya",
    shiftId: "shift_maya_week2_ed_evening",
    eventType: "CLOCK_IN",
    occurredAt: "2026-06-09T19:02:00.000Z",
    source: "BADGE",
    status: "NORMAL"
  },
  {
    id: "timecard_event_aria_unscheduled",
    employeeId: "emp_aria",
    userId: "user_aria_agency",
    shiftId: "shift_aria_agency_icu",
    eventType: "CLOCK_IN",
    occurredAt: "2026-06-11T22:41:00.000Z",
    source: "KIOSK",
    status: "FLAGGED"
  }
];

export const demoCredentials = [
  {
    employeeId: "emp_priya",
    employeeName: "Priya Raman",
    certification: "ACLS",
    status: "VERIFIED",
    expiresAt: "2027-01-01T00:00:00.000Z"
  },
  {
    employeeId: "emp_maya",
    employeeName: "Maya Shah",
    certification: "ICU Qualified",
    status: "VERIFIED",
    expiresAt: null
  },
  {
    employeeId: "emp_nina",
    employeeName: "Nina Patel",
    certification: "ACLS",
    status: "EXPIRING_SOON",
    expiresAt: "2026-06-15T00:00:00.000Z"
  },
  {
    employeeId: "emp_aria",
    employeeName: "Aria Agency",
    certification: "Agency Contract",
    status: "VERIFIED",
    expiresAt: "2026-12-31T00:00:00.000Z"
  },
  {
    employeeId: "emp_olivia",
    employeeName: "Olivia Charge",
    certification: "Charge Nurse Authorization",
    status: "VERIFIED",
    expiresAt: "2027-04-01T00:00:00.000Z"
  }
];

export const demoStaffDirectory = [
  {
    employeeId: "emp_priya",
    userId: "user_priya",
    name: "Priya Raman",
    role: "RN",
    unitId: "unit_icu",
    certifications: ["BLS", "ACLS", "ICU Qualified"],
    availability: "Assigned Friday ICU night",
    overtimeRisk: "MEDIUM"
  },
  {
    employeeId: "emp_maya",
    userId: "user_maya",
    name: "Maya Shah",
    role: "RN",
    unitId: "unit_icu",
    certifications: ["BLS", "ACLS", "ICU Qualified"],
    availability: "Available for Friday swap",
    overtimeRisk: "LOW"
  },
  {
    employeeId: "emp_nina",
    name: "Nina Patel",
    role: "RN",
    unitId: "unit_icu",
    certifications: ["BLS", "ACLS", "ICU Qualified"],
    availability: "Available for open night shift",
    overtimeRisk: "LOW"
  },
  {
    employeeId: "emp_olivia",
    userId: "user_olivia_charge",
    name: "Olivia Charge",
    role: "Charge RN",
    unitId: "unit_icu",
    certifications: ["BLS", "ACLS", "Charge Nurse Authorization"],
    availability: "Charge coverage Wednesday day",
    overtimeRisk: "LOW"
  },
  {
    employeeId: "emp_aria",
    userId: "user_aria_agency",
    name: "Aria Agency",
    role: "Agency RN",
    unitId: "unit_icu",
    certifications: ["BLS", "Agency Contract"],
    availability: "Agency assignment Thursday night",
    overtimeRisk: "MEDIUM"
  }
];

export const demoIntegrationConnections: IntegrationConnection[] = [
  {
    id: "integration_kronos_icu",
    system: "KRONOS",
    displayName: "Kronos ICU Workforce",
    status: "CONNECTED",
    direction: "BIDIRECTIONAL",
    lastSyncAt: "2026-05-27T22:15:00.000Z",
    nextSyncAt: "2026-05-28T10:00:00.000Z",
    recordTypes: ["EMPLOYEE", "SCHEDULE", "TIMECARD"]
  },
  {
    id: "integration_payroll_csv",
    system: "PAYROLL_CSV",
    displayName: "Payroll CSV Export",
    status: "NEEDS_ATTENTION",
    direction: "EXPORT",
    lastSyncAt: null,
    nextSyncAt: null,
    recordTypes: ["TIMECARD"]
  },
  {
    id: "integration_hris_credentials",
    system: "HRIS",
    displayName: "Credential HRIS Feed",
    status: "CONNECTED",
    direction: "IMPORT",
    lastSyncAt: "2026-05-27T08:00:00.000Z",
    nextSyncAt: "2026-05-28T08:00:00.000Z",
    recordTypes: ["EMPLOYEE", "CREDENTIAL"]
  }
];

export const demoIntegrationSyncRuns: IntegrationSyncRun[] = [
  {
    id: "sync_seed_kronos",
    integrationId: "integration_kronos_icu",
    status: "SUCCEEDED",
    startedAt: "2026-05-27T22:12:00.000Z",
    finishedAt: "2026-05-27T22:15:00.000Z",
    imported: 8,
    exported: 3,
    skipped: 1,
    failed: 0,
    summary: "Imported ICU staff and published schedule updates from Kronos."
  }
];

export const demoCsvImportRows: CsvPreviewRow[] = [
  {
    rowNumber: 1,
    externalId: "KRONOS-EMP-PRIYA",
    recordType: "EMPLOYEE",
    status: "UPDATED",
    message: "Matched Priya Raman by employee identifier."
  },
  {
    rowNumber: 2,
    externalId: "KRONOS-SHIFT-OPEN-ICU",
    recordType: "SCHEDULE",
    status: "SKIPPED",
    message: "Open ICU night shift already exists in PulseShift."
  },
  {
    rowNumber: 3,
    externalId: "KRONOS-TIME-MISSING",
    recordType: "TIMECARD",
    status: "FAILED",
    message: "Missing employee identifier; row requires correction before import."
  }
];

export type DemoAuditLogRecord = {
  id: string;
  organizationId: string;
  actorUserId?: string;
  actorType: "USER" | "AI_AGENT" | "SYSTEM" | "INTEGRATION";
  action: string;
  objectType: string;
  objectId: string;
  reason?: string;
  after?: Record<string, unknown>;
  createdAt: string;
};

export const demoAuditLogs: DemoAuditLogRecord[] = [
  {
    id: "audit_seed_demo",
    organizationId: "org_pulseshift_demo",
    actorType: "SYSTEM",
    action: "seed.demo_dataset",
    objectType: "Organization",
    objectId: "org_pulseshift_demo",
    createdAt: "2026-05-27T00:00:00.000Z"
  },
  {
    id: "audit_seed_schedule_publish",
    organizationId: "org_pulseshift_demo",
    actorUserId: "user_wendy_workforce",
    actorType: "USER",
    action: "schedule.publish.week_two",
    objectType: "Schedule",
    objectId: "fac_mercy_main_week_2026_06_08",
    reason: "Seeded multi-week sandbox schedule",
    createdAt: "2026-06-01T14:00:00.000Z"
  },
  {
    id: "audit_seed_credential_warning",
    organizationId: "org_pulseshift_demo",
    actorUserId: "user_carmen_credentials",
    actorType: "USER",
    action: "credential.review.expiring",
    objectType: "EmployeeCertification",
    objectId: "emp_nina_ACLS",
    reason: "Credential admin demo warning",
    createdAt: "2026-06-02T15:30:00.000Z"
  },
  {
    id: "audit_seed_integration_attention",
    organizationId: "org_pulseshift_demo",
    actorType: "INTEGRATION",
    action: "integration.sync_attention",
    objectType: "IntegrationConnection",
    objectId: "integration_payroll_csv",
    reason: "Payroll CSV export needs configuration",
    createdAt: "2026-06-03T08:00:00.000Z"
  }
];

export function appendDemoAuditLog(input: {
  actorUserId?: string;
  actorType: "USER" | "AI_AGENT" | "SYSTEM" | "INTEGRATION";
  action: string;
  objectType: string;
  objectId: string;
  reason?: string;
  after?: Record<string, unknown>;
}) {
  const record: DemoAuditLogRecord = {
    id: `audit_${demoAuditLogs.length + 1}`,
    organizationId: "org_pulseshift_demo",
    actorType: input.actorType,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    createdAt: new Date().toISOString()
  };
  if (input.actorUserId) {
    record.actorUserId = input.actorUserId;
  }
  if (input.reason) {
    record.reason = input.reason;
  }
  if (input.after) {
    record.after = input.after;
  }
  demoAuditLogs.push(record);
}

export const demoNotifications: Array<{
  id: string;
  organizationId: string;
  recipientUserId: string;
  type: string;
  channel: "IN_APP" | "EMAIL" | "SMS" | "PUSH" | "SLACK" | "TEAMS";
  category:
    | "SCHEDULE"
    | "SWAP"
    | "APPROVAL"
    | "STAFFING"
    | "TIMECARD"
    | "CREDENTIAL"
    | "INTEGRATION"
    | "AI_SAFETY"
    | "SYSTEM";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "READ";
  payload: Record<string, string>;
  retryCount: number;
  createdAt?: string;
  updatedAt?: string;
  readAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  failureReason?: string;
  lastAttemptedAt?: string;
  nextRetryAt?: string;
  providerMessageId?: string;
  providerMetadata?: Record<string, string>;
}> = [
  {
    id: "notification_staffing_risk_icu",
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_jordan_manager",
    type: "STAFFING_RISK",
    channel: "IN_APP",
    category: "STAFFING",
    priority: "HIGH",
    status: "QUEUED",
    payload: { shiftId: "shift_open_icu_night" },
    retryCount: 0
  },
  {
    id: "notification_timecard_late_priya",
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_priya",
    type: "TIMECARD_EXCEPTION",
    channel: "IN_APP",
    category: "TIMECARD",
    priority: "HIGH",
    status: "QUEUED",
    payload: { exceptionId: "timecard_exception_late_priya" },
    retryCount: 0
  },
  {
    id: "notification_charge_coverage",
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_olivia_charge",
    type: "UNIT_COVERAGE",
    channel: "IN_APP",
    category: "STAFFING",
    priority: "HIGH",
    status: "QUEUED",
    payload: { unitId: "unit_icu", shiftId: "shift_open_icu_week3" },
    retryCount: 0
  },
  {
    id: "notification_workforce_publish",
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_wendy_workforce",
    type: "SCHEDULE_PUBLISH_READY",
    channel: "IN_APP",
    category: "SCHEDULE",
    priority: "NORMAL",
    status: "QUEUED",
    payload: { facilityId: "fac_mercy_main" },
    retryCount: 0
  },
  {
    id: "notification_float_gap",
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_felix_float",
    type: "FLOAT_POOL_CANDIDATES",
    channel: "IN_APP",
    category: "STAFFING",
    priority: "HIGH",
    status: "QUEUED",
    payload: { gapId: "gap_icu_night_rn" },
    retryCount: 0
  },
  {
    id: "notification_credential_expiring",
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_carmen_credentials",
    type: "CREDENTIAL_EXPIRING",
    channel: "IN_APP",
    category: "CREDENTIAL",
    priority: "HIGH",
    status: "QUEUED",
    payload: { employeeId: "emp_nina" },
    retryCount: 0
  },
  {
    id: "notification_audit_review",
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_avery_auditor",
    type: "AUDIT_REVIEW",
    channel: "IN_APP",
    category: "AI_SAFETY",
    priority: "NORMAL",
    status: "QUEUED",
    payload: { auditId: "audit_seed_integration_attention" },
    retryCount: 0
  },
  {
    id: "notification_exec_summary",
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_evan_exec",
    type: "WORKFORCE_SUMMARY",
    channel: "EMAIL",
    category: "STAFFING",
    priority: "NORMAL",
    status: "QUEUED",
    payload: { facilityId: "fac_mercy_main" },
    retryCount: 0
  },
  {
    id: "notification_agency_open_shift",
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_aria_agency",
    type: "AGENCY_OPEN_SHIFT",
    channel: "IN_APP",
    category: "STAFFING",
    priority: "HIGH",
    status: "QUEUED",
    payload: { shiftId: "shift_open_ed_day_week2" },
    retryCount: 0
  },
  {
    id: "notification_delivery_failed_admin",
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_admin",
    type: "INTEGRATION_ATTENTION",
    channel: "EMAIL",
    category: "INTEGRATION",
    priority: "HIGH",
    status: "FAILED",
    payload: { connectionId: "integration_kronos" },
    retryCount: 2,
    failedAt: "2026-06-05T13:30:00.000Z",
    failureReason: "Provider rejected the delivery address",
    lastAttemptedAt: "2026-06-05T13:30:00.000Z",
    nextRetryAt: "2026-06-05T14:00:00.000Z",
    providerMessageId: "demo-provider-failure-1",
    providerMetadata: { provider: "demo-email" }
  }
];

export const demoAIToolCalls: Array<{
  id: string;
  userId: string;
  toolName: string;
  inputJson: Record<string, unknown>;
  outputJson?: Record<string, unknown>;
  status: "PROPOSED" | "AUTHORIZED" | "EXECUTED" | "BLOCKED" | "FAILED";
  riskLevel: "READ_ONLY" | "LOW_RISK_WRITE" | "APPROVAL_REQUIRED" | "BLOCKED";
  createdAt: string;
}> = [];

export const demoCopilotEvalRuns: CopilotEvalRun[] = [];

export function resetDemoWorkflowState() {
  demoSwaps.splice(0, demoSwaps.length);
  demoApprovals.splice(0, demoApprovals.length);
  demoAIToolCalls.splice(0, demoAIToolCalls.length);
  demoCopilotEvalRuns.splice(0, demoCopilotEvalRuns.length);
  demoAuditLogs.splice(4, demoAuditLogs.length - 4);
  demoIntegrationSyncRuns.splice(1, demoIntegrationSyncRuns.length - 1);
  demoTimecardEvents.splice(0, demoTimecardEvents.length, {
    id: "timecard_event_priya_late_clock_in",
    employeeId: "emp_priya",
    userId: "user_priya",
    shiftId: "shift_priya_friday_icu_night",
    eventType: "CLOCK_IN",
    occurredAt: "2026-05-29T23:17:00.000Z",
    source: "MOBILE",
    status: "FLAGGED"
  }, {
    id: "timecard_event_priya_clock_out",
    employeeId: "emp_priya",
    userId: "user_priya",
    shiftId: "shift_priya_friday_icu_night",
    eventType: "CLOCK_OUT",
    occurredAt: "2026-05-30T11:03:00.000Z",
    source: "MOBILE",
    status: "NORMAL"
  });

  const priyaShift = demoSchedules.find((shift) => shift.id === "shift_priya_friday_icu_night");
  if (priyaShift) {
    priyaShift.employeeId = "emp_priya";
    priyaShift.userId = "user_priya";
    priyaShift.status = "PUBLISHED";
  }

  const openShift = demoSchedules.find((shift) => shift.id === "shift_open_icu_night");
  if (openShift) {
    delete openShift.employeeId;
    delete openShift.userId;
    openShift.status = "OPEN";
  }

  const weekTwoOpenShift = demoSchedules.find((shift) => shift.id === "shift_open_ed_day_week2");
  if (weekTwoOpenShift) {
    delete weekTwoOpenShift.employeeId;
    delete weekTwoOpenShift.userId;
    weekTwoOpenShift.status = "OPEN";
  }

  const weekThreeOpenShift = demoSchedules.find((shift) => shift.id === "shift_open_icu_week3");
  if (weekThreeOpenShift) {
    delete weekThreeOpenShift.employeeId;
    delete weekThreeOpenShift.userId;
    weekThreeOpenShift.status = "OPEN";
  }

  for (const exception of demoTimecardExceptions) {
    exception.status = "OPEN";
  }
}
