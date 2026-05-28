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

export type Notification = {
  id: string;
  recipientUserId: string;
  type: string;
  status: "QUEUED" | "READ";
  payload: Record<string, string>;
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
