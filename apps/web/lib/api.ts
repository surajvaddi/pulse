import { demoAuthEnabledForEnv } from "@/lib/demo-controls";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
export const demoAuthEnabled = demoAuthEnabledForEnv();

export type ApiErrorCategory =
  | "LOGIN_REQUIRED"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "WORKFLOW_CONFLICT"
  | "RETRYABLE"
  | "REQUEST_FAILED";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly requestId: string | null,
    public readonly category: ApiErrorCategory,
    message: string
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function apiRequestErrorFor(
  status: number,
  requestId: string | null = null
) {
  if (status === 401) {
    return new ApiRequestError(
      status,
      requestId,
      "LOGIN_REQUIRED",
      "Your session has expired. Sign in again."
    );
  }
  if (status === 403) {
    return new ApiRequestError(
      status,
      requestId,
      "PERMISSION_DENIED",
      "Your account does not have access to this action."
    );
  }
  if (status === 404) {
    return new ApiRequestError(
      status,
      requestId,
      "NOT_FOUND",
      "The requested resource could not be found."
    );
  }
  if (status === 409) {
    return new ApiRequestError(
      status,
      requestId,
      "WORKFLOW_CONFLICT",
      "This workflow changed before the action completed. Refresh and try again."
    );
  }
  if (status >= 500) {
    return new ApiRequestError(
      status,
      requestId,
      "RETRYABLE",
      "The service is temporarily unavailable. Try again."
    );
  }
  return new ApiRequestError(
    status,
    requestId,
    "REQUEST_FAILED",
    "The request could not be completed."
  );
}

function requestError(response: Response) {
  return apiRequestErrorFor(
    response.status,
    response.headers.get("x-request-id")
  );
}

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
  userId: string;
  organizationId: string;
  displayName: string;
  email: string;
  role: string;
  permissions: string[];
  supabaseAuthId?: string;
  employeeProfile?: {
    id: string;
    employeeNumber: string;
    legalName: string;
    primaryFacilityId: string;
    primaryUnitId: string;
  } | null;
  workforceOnboardingAssignment?: {
    facility: { id: string; name: string };
    unit: { id: string; name: string };
    workforceRole: { id: string; name: string };
    employmentType: string;
    employeeNumberPolicy: string;
    employeeNumber?: string | null;
  } | null;
  needsProfileOnboarding?: boolean;
  needsNotificationPreferencesOnboarding?: boolean;
  needsIntegrationsOnboarding?: boolean;
  facilityCount?: number;
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
  acceptanceHandle?: string;
  workforceAssignment?: {
    facilityId: string;
    unitId: string;
    workforceRoleId: string;
    employmentType: "FULL_TIME" | "PART_TIME" | "PER_DIEM" | "CONTRACT" | "AGENCY";
    employeeNumberPolicy: "AUTO" | "ASSIGNED";
    employeeNumber?: string;
  };
};

export type InvitationOptions = {
  facilities: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; facilityId: string }>;
  workforceRoles: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
};

export type WorkspaceContext = {
  facilities: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; facilityId: string }>;
  defaultSelection: { facilityId?: string; unitId?: string };
  activeSelection: { facilityId?: string; unitId?: string };
  roleGrants: Array<{
    permission: string;
    scope: Record<string, unknown>;
  }>;
};

export type AdminSetupProgress = {
  completed: number;
  total: number;
  items: Array<{
    id: string;
    label?: string;
    complete: boolean;
    href?: string;
  }>;
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

export type ShiftPolicyDecisionSnapshot = {
  allowed: boolean;
  requiresApproval: boolean;
  riskFlags: string[];
  blockingReasons: string[];
  warnings: string[];
  evaluatedAt: string;
};

export type ShiftPipelineSlot = {
  id: string;
  organizationId: string;
  facilityId: string;
  unitId: string;
  requirementId?: string;
  roleRequiredId: string;
  certificationRequiredIds: string[];
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  riskFlags: string[];
};

export type OpenShiftEligibility = {
  employeeId: string;
  userId: string;
  displayName: string;
  eligibility: "ELIGIBLE" | "WARNING" | "BLOCKED";
  reasons: string[];
  riskFlags: string[];
};

export type OpenShiftResult = {
  slot: ShiftPipelineSlot;
  eligibility: OpenShiftEligibility | null;
};

export type ShiftPipelineClaim = {
  id: string;
  organizationId: string;
  slotId: string;
  employeeId: string;
  userId: string;
  status: string;
  policyDecision: ShiftPolicyDecisionSnapshot;
  approvalRequestId?: string;
  assignmentId?: string;
  createdAt: string;
  decidedAt?: string;
  expiresAt?: string;
};

export type ShiftPipelineAssignment = {
  id: string;
  organizationId: string;
  slotId: string;
  employeeId: string;
  assignedByUserId: string;
  status: string;
  source: string;
  createdAt: string;
  endedAt?: string;
};

export type AssignmentCandidate = {
  employeeId: string;
  userId: string;
  displayName: string;
  eligibility: "ELIGIBLE" | "WARNING" | "BLOCKED";
  reasons: string[];
  riskFlags: string[];
};

export type OperationalShift = {
  id: string;
  organizationId: string;
  facilityId: string;
  unitId: string;
  slotId: string;
  assignmentId?: string;
  employeeId?: string;
  assignedByUserId?: string;
  roleRequiredId: string;
  certificationRequiredIds: string[];
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  riskFlags: string[];
  swappable: boolean;
  claimable: boolean;
};

export type ShiftSwapCandidate = {
  userId: string;
  employeeId: string;
  displayName: string;
  eligible: boolean;
  requiresApproval: boolean;
  riskFlags: string[];
  blockingReasons: string[];
  warnings: string[];
  evaluatedAt: string;
};

export type ShiftSwapRequest = {
  id: string;
  organizationId: string;
  originalSlotId: string;
  requesterEmployeeId: string;
  requesterUserId: string;
  proposedEmployeeId: string;
  proposedUserId: string;
  unitId: string;
  status: string;
  policyDecision: ShiftPolicyDecisionSnapshot;
  managerApprovalRequired: boolean;
  approvalRequestId?: string;
  assignmentId?: string;
  createdAt: string;
  decidedAt?: string;
  expiresAt?: string;
};

export type ShiftPipelineApproval = {
  id: string;
  approvalType: string;
  requestedByUserId: string;
  approverUserId?: string;
  targetObjectType: string;
  targetObjectId: string;
  status: string;
  riskFlags: string[];
  decisionReason?: string;
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
  page?: string;
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
    argumentAccuracy: number;
    expectedToolsOffered: boolean;
    registryFilteringFailure: boolean;
    offeredTools: string[];
    proposedTool?: string;
    normalizedArguments?: Record<string, unknown>;
    policyDecision?: string;
    previewResult?: string;
    executionResult?: string;
    failureCategory?: string;
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
    throw requestError(response);
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
    throw requestError(response);
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
    throw requestError(response);
  }

  return (await response.json()) as T;
}

export async function apiPublicGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw requestError(response);
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
    throw requestError(response);
  }

  return (await response.json()) as T;
}

export async function apiGetWithAccessToken<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw requestError(response);
  }

  return (await response.json()) as T;
}

export async function apiGetSession<T>(path: string, fallbackUserId: DemoUserId = "user_priya"): Promise<T> {
  const { readSupabaseAccessToken } = await import("@/lib/onboarding-access");
  const accessToken = await readSupabaseAccessToken();
  if (accessToken) {
    return apiGetWithAccessToken<T>(path, accessToken);
  }
  return apiGet<T>(path, fallbackUserId);
}

export async function apiPostSession<T>(
  path: string,
  body: Record<string, unknown> = {},
  fallbackUserId: DemoUserId = "user_priya"
): Promise<T> {
  const { readSupabaseAccessToken } = await import("@/lib/onboarding-access");
  const accessToken = await readSupabaseAccessToken();
  if (accessToken) {
    return apiPostWithAccessToken<T>(path, body, accessToken);
  }
  return apiPost<T>(path, body, fallbackUserId);
}

export async function apiPatchSession<T>(
  path: string,
  body: Record<string, unknown> = {},
  fallbackUserId: DemoUserId = "user_priya"
): Promise<T> {
  const { readSupabaseAccessToken } = await import("@/lib/onboarding-access");
  const accessToken = await readSupabaseAccessToken();
  if (accessToken) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    if (!response.ok) {
      throw requestError(response);
    }
    return (await response.json()) as T;
  }
  return apiPatch<T>(path, body, fallbackUserId);
}
