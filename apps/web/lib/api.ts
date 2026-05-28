export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type DemoUserId =
  | "user_priya"
  | "user_maya"
  | "user_jordan_manager"
  | "user_payroll"
  | "user_admin";

export type SessionSummary = {
  userId: DemoUserId;
  organizationId: string;
  displayName: string;
  email: string;
  role: string;
  permissions: string[];
};

export type Invitation = {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  scope: Record<string, unknown>;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  invitedByUserId: string;
  acceptedByUserId?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  acceptUrl?: string;
  token?: string;
  nextStep?: string;
};

export type DemoShift = {
  id: string;
  employeeId?: string;
  userId?: string;
  unitId: string;
  facilityId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export type TimecardException = {
  id: string;
  employeeId: string;
  userId: string;
  unitId: string;
  type: string;
  severity: string;
  status: string;
  explanation: string;
};

export type TimecardEvent = {
  id: string;
  employeeId: string;
  userId: string;
  shiftId?: string;
  eventType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";
  occurredAt: string;
  source: string;
  status: string;
};

export type TimeclockStatus = {
  employeeId: string;
  status: "CLOCKED_IN" | "CLOCKED_OUT";
  currentShiftId: string | null;
  currentShiftTitle: string | null;
  lastEvent: TimecardEvent | null;
};

export type DemoSwap = {
  id: string;
  requesterUserId: string;
  proposedUserId: string;
  originalShiftId: string;
  unitId: string;
  status: string;
  riskFlags: string[];
  timeline: string[];
};

export type AuditLog = {
  id: string;
  actorUserId?: string;
  actorType: string;
  action: string;
  objectType: string;
  objectId: string;
  reason?: string;
  after?: Record<string, unknown>;
  createdAt: string;
};

export type AIToolCall = {
  id: string;
  userId: string;
  toolName: string;
  inputJson: Record<string, unknown>;
  outputJson?: Record<string, unknown>;
  status: string;
  riskLevel: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  recipientUserId: string;
  type: string;
  status: "QUEUED" | "READ";
  payload: Record<string, string>;
};

export type CopilotResponse = {
  mode: "ANSWER" | "ACTION_PREVIEW" | "BLOCKED";
  answer: string;
  toolCalls: Array<{
    id: string;
    toolName: string;
    status: string;
    riskLevel: string;
  }>;
};

export type StaffingGap = {
  id: string;
  unitId: string;
  role: string;
  requiredCount: number;
  assignedCount: number;
  gapCount: number;
  severity: string;
  recommendedActions: string[];
};

export type CoverageCandidate = {
  employeeId: string;
  name: string;
  role: string;
  eligibility: string;
  availability: string;
  overtimeRisk: string;
};

export type StaffMember = CoverageCandidate & {
  unitId?: string;
  certifications?: string[];
};

export type CredentialWarning = {
  employeeId: string;
  employeeName: string;
  certification: string;
  status: string;
  expiresAt: string | null;
};

export type IntegrationConnection = {
  id: string;
  system: string;
  displayName: string;
  status: string;
  direction: string;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  recordTypes: string[];
};

export type IntegrationSyncRun = {
  id: string;
  integrationId: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  imported: number;
  exported: number;
  skipped: number;
  failed: number;
  summary: string;
};

export type IntegrationImportPreview = {
  integrationId: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  rows: Array<{
    rowNumber: number;
    externalId: string;
    recordType: string;
    status: string;
    message: string;
  }>;
};

export type CopilotEvalTask = {
  id: string;
  title: string;
  actorUserId: string;
  actorRole: string;
  prompt: string;
  expectedMode: string;
  expectedTools: string[];
  forbiddenTools: string[];
  requiredAnswerSignals: string[];
};

export type CopilotEvalRun = {
  id: string;
  createdAt: string;
  taskCount: number;
  passedCount: number;
  failedCount: number;
  metrics: {
    toolSelectionAccuracy: number;
    unsafeActionAttemptRate: number;
    finalAnswerCorrectness: number;
  };
  results: Array<{
    taskId: string;
    passed: boolean;
    toolSelectionAccuracy: number;
    forbiddenToolCount: number;
    unsafeActionAttempted: boolean;
    modeMatches: boolean;
    answerSignalCoverage: number;
    notes: string[];
  }>;
};

export const demoUsers: Array<{ id: DemoUserId; label: string; role: string }> = [
  { id: "user_priya", label: "Priya Raman", role: "Employee" },
  { id: "user_maya", label: "Maya Shah", role: "Employee" },
  { id: "user_jordan_manager", label: "Jordan Lee", role: "Unit Manager" },
  { id: "user_payroll", label: "Sam Payroll", role: "Payroll" },
  { id: "user_admin", label: "Alex Admin", role: "Admin" }
];

export async function apiGet<T>(path: string, userId: DemoUserId = "user_priya"): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "x-demo-user-id": userId
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function apiPost<T>(
  path: string,
  body: Record<string, unknown> = {},
  userId: DemoUserId = "user_priya"
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-demo-user-id": userId
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}
