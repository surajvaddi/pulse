import { demoAuthEnabledForEnv } from "@/lib/demo-controls";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
export const demoAuthEnabled = demoAuthEnabledForEnv();

export type DemoUserId =
  | "user_priya"
  | "user_maya"
  | "user_jordan_manager"
  | "user_olivia_charge"
  | "user_wendy_workforce"
  | "user_felix_float"
  | "user_payroll"
  | "user_carmen_credentials"
  | "user_avery_auditor"
  | "user_evan_exec"
  | "user_aria_agency"
  | "user_owner"
  | "user_admin"
  | "user_ai_service";

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
  provider?: string;
  model?: string;
  route?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  pageContext?: string;
  actorRole?: string;
  scopeSummary?: string;
  safetyStatus?: string;
  deniedReason?: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  organizationId: string;
  recipientUserId: string;
  channel: string;
  type: string;
  category: string;
  priority: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "READ";
  payload: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
  readAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  failureReason?: string;
  retryCount: number;
  lastAttemptedAt?: string;
  nextRetryAt?: string;
  providerMessageId?: string;
  providerMetadata?: Record<string, string>;
};

export type NotificationSummary = {
  unreadCount: number;
  recent: Notification[];
};

export type NotificationPreference = {
  id: string;
  userId: string;
  role: string;
  category: string;
  channel: string;
  enabled: boolean;
  required: boolean;
  priority: string;
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

export type AdminOrganization = {
  id: string;
  name: string;
  timezone: string;
  status: string;
};

export type AdminFacility = {
  id: string;
  organizationId: string;
  name: string;
  timezone: string;
  status: string;
};

export type AdminUnit = {
  id: string;
  facilityId: string;
  name: string;
  type: string;
  managerUserIds: string[];
  active: boolean;
};

export type AdminUser = {
  id: string;
  organizationId: string;
  email: string;
  displayName: string;
  status: string;
  roles: string[];
};

export type AdminInvitation = {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  scope: Record<string, unknown>;
  status: string;
  invitedByUserId: string;
  acceptedByUserId?: string;
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
  { id: "user_olivia_charge", label: "Olivia Charge", role: "Charge Nurse" },
  { id: "user_wendy_workforce", label: "Wendy Workforce", role: "Workforce Admin" },
  { id: "user_felix_float", label: "Felix Float", role: "Float Pool" },
  { id: "user_payroll", label: "Sam Payroll", role: "Payroll" },
  { id: "user_carmen_credentials", label: "Carmen Credentials", role: "Credentialing" },
  { id: "user_avery_auditor", label: "Avery Auditor", role: "Auditor" },
  { id: "user_evan_exec", label: "Evan Executive", role: "Executive" },
  { id: "user_aria_agency", label: "Aria Agency", role: "Agency Admin" },
  { id: "user_owner", label: "Morgan Owner", role: "Owner" },
  { id: "user_admin", label: "Alex Admin", role: "System Admin" },
  { id: "user_ai_service", label: "PulseShift AI Service", role: "Service" }
];

async function authHeaders(userId: DemoUserId) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ps_access_token")?.value;
  if (accessToken) {
    return {
      authorization: `Bearer ${accessToken}`
    };
  }
  if (!demoAuthEnabled) {
    return {};
  }
  const demoUserId = (cookieStore.get("ps_demo_user_id")?.value ?? userId) as DemoUserId;
  return {
    "x-demo-user-id": demoUserId
  };
}

export async function apiGet<T>(path: string, userId: DemoUserId = "user_priya"): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: await authHeaders(userId),
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
      ...(await authHeaders(userId))
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function apiPatch<T>(
  path: string,
  body: Record<string, unknown> = {},
  userId: DemoUserId = "user_priya"
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(await authHeaders(userId))
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function apiPublicGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function apiPostWithAccessToken<T>(
  path: string,
  body: Record<string, unknown> = {},
  accessToken: string
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}
