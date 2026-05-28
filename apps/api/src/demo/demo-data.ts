export const demoEmployeeByUserId = new Map<string, string>([
  ["user_priya", "emp_priya"],
  ["user_maya", "emp_maya"]
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
  recipientUserId: string;
  type: string;
  status: "QUEUED" | "READ";
  payload: Record<string, string>;
}> = [
  {
    id: "notification_staffing_risk_icu",
    recipientUserId: "user_jordan_manager",
    type: "STAFFING_RISK",
    status: "QUEUED",
    payload: { shiftId: "shift_open_icu_night" }
  },
  {
    id: "notification_timecard_late_priya",
    recipientUserId: "user_priya",
    type: "TIMECARD_EXCEPTION",
    status: "QUEUED",
    payload: { exceptionId: "timecard_exception_late_priya" }
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

export function resetDemoWorkflowState() {
  demoSwaps.splice(0, demoSwaps.length);
  demoApprovals.splice(0, demoApprovals.length);
  demoAIToolCalls.splice(0, demoAIToolCalls.length);
  demoAuditLogs.splice(1, demoAuditLogs.length - 1);

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

  const timecardException = demoTimecardExceptions.find(
    (exception) => exception.id === "timecard_exception_late_priya"
  );
  if (timecardException) {
    timecardException.status = "OPEN";
  }
}
