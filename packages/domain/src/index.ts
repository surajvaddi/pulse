import { z } from "zod";

export const PULSESHIFT_PRODUCT = "PulseShift";

export type PhaseHealth = {
  service: string;
  status: "ok";
  phase: string;
};

export const UserStatusSchema = z.enum(["INVITED", "ACTIVE", "SUSPENDED", "DEACTIVATED"]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const InvitationStatusSchema = z.enum(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]);
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

export const OrganizationStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "TRIAL"]);
export type OrganizationStatus = z.infer<typeof OrganizationStatusSchema>;

export const FacilityStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export type FacilityStatus = z.infer<typeof FacilityStatusSchema>;

export const UnitTypeSchema = z.enum([
  "ICU",
  "ED",
  "MED_SURG",
  "OR",
  "PEDIATRICS",
  "RADIOLOGY",
  "LAB",
  "OTHER"
]);
export type UnitType = z.infer<typeof UnitTypeSchema>;

export const EmploymentTypeSchema = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "PER_DIEM",
  "CONTRACT",
  "AGENCY"
]);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

export const EmployeeStatusSchema = z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]);
export type EmployeeStatus = z.infer<typeof EmployeeStatusSchema>;

export const CertificationStatusSchema = z.enum(["PENDING", "VERIFIED", "EXPIRED", "REVOKED"]);
export type CertificationStatus = z.infer<typeof CertificationStatusSchema>;

export const ShiftStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "ASSIGNED",
  "PUBLISHED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED"
]);
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

export const ShiftSourceSchema = z.enum(["MANUAL", "TEMPLATE", "IMPORT", "AI_DRAFT", "INTEGRATION"]);
export type ShiftSource = z.infer<typeof ShiftSourceSchema>;

export const ShiftSlotStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "CLAIM_PENDING",
  "ASSIGNED",
  "PUBLISHED",
  "LOCKED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED"
]);
export type ShiftSlotStatus = z.infer<typeof ShiftSlotStatusSchema>;

export const ShiftAssignmentStatusSchema = z.enum(["ACTIVE", "COMPLETED", "CANCELLED", "SUPERSEDED"]);
export type ShiftAssignmentStatus = z.infer<typeof ShiftAssignmentStatusSchema>;

export const ShiftClaimStatusSchema = z.enum([
  "SUBMITTED",
  "PENDING_POLICY_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "ASSIGNED",
  "DENIED",
  "CANCELLED",
  "EXPIRED"
]);
export type ShiftClaimStatus = z.infer<typeof ShiftClaimStatusSchema>;

export const AvailabilityTypeSchema = z.enum(["AVAILABLE", "UNAVAILABLE", "PREFERRED", "AVOID"]);
export type AvailabilityType = z.infer<typeof AvailabilityTypeSchema>;

export const RequestStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "PENDING_COUNTERPARTY",
  "PENDING_MANAGER",
  "APPROVED",
  "DENIED",
  "CANCELLED",
  "EXPIRED"
]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const TimecardEventTypeSchema = z.enum([
  "CLOCK_IN",
  "CLOCK_OUT",
  "BREAK_START",
  "BREAK_END"
]);
export type TimecardEventType = z.infer<typeof TimecardEventTypeSchema>;

export const TimecardExceptionTypeSchema = z.enum([
  "EARLY_CLOCK_IN",
  "LATE_CLOCK_IN",
  "MISSED_CLOCK_OUT",
  "UNSCHEDULED_CLOCK_IN",
  "MISSED_BREAK",
  "OVERTIME_RISK",
  "LOCATION_MISMATCH"
]);
export type TimecardExceptionType = z.infer<typeof TimecardExceptionTypeSchema>;

export const SeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const ApprovalTypeSchema = z.enum([
  "SHIFT_SWAP",
  "SHIFT_ASSIGNMENT",
  "OVERTIME_OVERRIDE",
  "TIMECARD_CORRECTION",
  "CREDENTIAL_OVERRIDE",
  "SCHEDULE_PUBLISH"
]);
export type ApprovalType = z.infer<typeof ApprovalTypeSchema>;

export const ApprovalStatusSchema = z.enum(["PENDING", "APPROVED", "DENIED", "CANCELLED", "EXPIRED"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const NotificationChannelSchema = z.enum([
  "IN_APP",
  "EMAIL",
  "SMS",
  "PUSH",
  "SLACK",
  "TEAMS"
]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationStatusSchema = z.enum([
  "QUEUED",
  "SENT",
  "DELIVERED",
  "FAILED",
  "READ"
]);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

export const NotificationCategorySchema = z.enum([
  "SCHEDULE",
  "SWAP",
  "APPROVAL",
  "STAFFING",
  "TIMECARD",
  "CREDENTIAL",
  "INTEGRATION",
  "AI_SAFETY",
  "SYSTEM"
]);
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

export const NotificationPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

export const ToolRiskLevelSchema = z.enum([
  "READ_ONLY",
  "LOW_RISK_WRITE",
  "APPROVAL_REQUIRED",
  "BLOCKED"
]);
export type ToolRiskLevel = z.infer<typeof ToolRiskLevelSchema>;

export const AIToolCallStatusSchema = z.enum([
  "PROPOSED",
  "AUTHORIZED",
  "EXECUTED",
  "BLOCKED",
  "FAILED"
]);
export type AIToolCallStatus = z.infer<typeof AIToolCallStatusSchema>;

export const ActorTypeSchema = z.enum(["USER", "AI_AGENT", "SYSTEM", "INTEGRATION"]);
export type ActorType = z.infer<typeof ActorTypeSchema>;

export const PermissionSchema = z.enum([
  "schedule:read:self",
  "schedule:read:unit",
  "schedule:read:facility",
  "schedule:write:draft",
  "schedule:publish",
  "shift:claim",
  "shift:release",
  "shift:swap:create",
  "shift:swap:approve",
  "shift:assign",
  "shift:assign:override",
  "availability:read:self",
  "availability:write:self",
  "availability:read:unit",
  "pto:create:self",
  "pto:approve",
  "timecard:read:self",
  "timecard:read:unit",
  "timecard:write:self",
  "timecard:resolve",
  "payroll:export",
  "credential:read",
  "credential:write",
  "notification:send:unit",
  "notification:send:facility",
  "audit:read",
  "integration:manage",
  "user:manage",
  "ai:use",
  "ai:admin"
]);
export type Permission = z.infer<typeof PermissionSchema>;

export const AccountRoleSchema = z.enum([
  "ORGANIZATION_OWNER",
  "SYSTEM_ADMIN",
  "WORKFORCE_ADMIN",
  "UNIT_MANAGER",
  "CHARGE_NURSE",
  "EMPLOYEE",
  "FLOAT_POOL_COORDINATOR",
  "PAYROLL_ADMIN",
  "CREDENTIALING_ADMIN",
  "COMPLIANCE_AUDITOR",
  "EXECUTIVE_VIEWER",
  "EXTERNAL_AGENCY_ADMIN",
  "AI_AGENT_SERVICE"
]);
export type AccountRole = z.infer<typeof AccountRoleSchema>;

export const ScopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SELF") }),
  z.object({ type: z.literal("UNIT"), unitIds: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("FACILITY"), facilityIds: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("ORG"), organizationId: z.string() })
]);
export type Scope = z.infer<typeof ScopeSchema>;

export const PermissionGrantSchema = z.object({
  permission: PermissionSchema,
  scope: ScopeSchema
});
export type PermissionGrant = z.infer<typeof PermissionGrantSchema>;

const IsoDateTimeStringSchema = z.string().datetime();

export const ShiftPolicyDecisionSnapshotSchema = z.object({
  allowed: z.boolean(),
  requiresApproval: z.boolean(),
  riskFlags: z.array(z.string()),
  blockingReasons: z.array(z.string()),
  warnings: z.array(z.string()),
  evaluatedAt: IsoDateTimeStringSchema
});
export type ShiftPolicyDecisionSnapshot = z.infer<typeof ShiftPolicyDecisionSnapshotSchema>;

export const StaffingRequirementContractSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  facilityId: z.string(),
  unitId: z.string(),
  roleId: z.string(),
  certificationRequiredIds: z.array(z.string()),
  startAt: IsoDateTimeStringSchema,
  endAt: IsoDateTimeStringSchema,
  minRequired: z.number().int().nonnegative(),
  idealRequired: z.number().int().nonnegative().optional(),
  source: z.string()
});
export type StaffingRequirementContract = z.infer<typeof StaffingRequirementContractSchema>;

export const ShiftSlotContractSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  facilityId: z.string(),
  unitId: z.string(),
  requirementId: z.string().optional(),
  roleRequiredId: z.string(),
  certificationRequiredIds: z.array(z.string()),
  startsAt: IsoDateTimeStringSchema,
  endsAt: IsoDateTimeStringSchema,
  status: ShiftSlotStatusSchema,
  source: ShiftSourceSchema,
  riskFlags: z.array(z.string())
});
export type ShiftSlotContract = z.infer<typeof ShiftSlotContractSchema>;

export const ShiftAssignmentContractSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  slotId: z.string(),
  employeeId: z.string(),
  assignedByUserId: z.string(),
  status: ShiftAssignmentStatusSchema,
  source: z.enum(["CLAIM", "MANAGER_ASSIGNMENT", "IMPORT", "SWAP", "SYSTEM"]),
  createdAt: IsoDateTimeStringSchema,
  endedAt: IsoDateTimeStringSchema.optional()
});
export type ShiftAssignmentContract = z.infer<typeof ShiftAssignmentContractSchema>;

export const ShiftClaimRequestContractSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  slotId: z.string(),
  employeeId: z.string(),
  userId: z.string(),
  status: ShiftClaimStatusSchema,
  policyDecision: ShiftPolicyDecisionSnapshotSchema,
  approvalRequestId: z.string().optional(),
  assignmentId: z.string().optional(),
  createdAt: IsoDateTimeStringSchema,
  decidedAt: IsoDateTimeStringSchema.optional(),
  expiresAt: IsoDateTimeStringSchema.optional()
});
export type ShiftClaimRequestContract = z.infer<typeof ShiftClaimRequestContractSchema>;

export const OperationalShiftContractSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  facilityId: z.string(),
  unitId: z.string(),
  slotId: z.string(),
  assignmentId: z.string().optional(),
  employeeId: z.string().optional(),
  assignedByUserId: z.string().optional(),
  roleRequiredId: z.string(),
  certificationRequiredIds: z.array(z.string()),
  startsAt: IsoDateTimeStringSchema,
  endsAt: IsoDateTimeStringSchema,
  status: ShiftSlotStatusSchema,
  source: ShiftSourceSchema,
  riskFlags: z.array(z.string()),
  swappable: z.boolean(),
  claimable: z.boolean()
});
export type OperationalShiftContract = z.infer<typeof OperationalShiftContractSchema>;

export function operationalShiftFromSlot(input: {
  slot: ShiftSlotContract;
  assignment?: ShiftAssignmentContract | null;
}): OperationalShiftContract {
  return OperationalShiftContractSchema.parse({
    id: input.slot.id,
    organizationId: input.slot.organizationId,
    facilityId: input.slot.facilityId,
    unitId: input.slot.unitId,
    slotId: input.slot.id,
    ...(input.assignment?.id ? { assignmentId: input.assignment.id } : {}),
    ...(input.assignment?.employeeId ? { employeeId: input.assignment.employeeId } : {}),
    ...(input.assignment?.assignedByUserId ? { assignedByUserId: input.assignment.assignedByUserId } : {}),
    roleRequiredId: input.slot.roleRequiredId,
    certificationRequiredIds: input.slot.certificationRequiredIds,
    startsAt: input.slot.startsAt,
    endsAt: input.slot.endsAt,
    status: input.slot.status,
    source: input.slot.source,
    riskFlags: input.slot.riskFlags,
    swappable: Boolean(input.assignment?.employeeId) && ["ASSIGNED", "PUBLISHED"].includes(input.slot.status),
    claimable: input.slot.status === "OPEN"
  });
}

export function assertShiftCoverageInvariants(input: {
  slot: ShiftSlotContract;
  assignments: ShiftAssignmentContract[];
  claims: ShiftClaimRequestContract[];
}) {
  const activeAssignments = input.assignments.filter((assignment) => assignment.status === "ACTIVE");
  if (activeAssignments.length > 1) {
    throw new Error(`Shift slot ${input.slot.id} has more than one active assignment`);
  }
  if (input.slot.status === "ASSIGNED" && activeAssignments.length !== 1) {
    throw new Error(`Assigned shift slot ${input.slot.id} must have exactly one active assignment`);
  }
  for (const claim of input.claims) {
    if (claim.status === "PENDING_APPROVAL" && !claim.approvalRequestId) {
      throw new Error(`Pending approval claim ${claim.id} must reference an approval request`);
    }
    if (claim.status === "ASSIGNED" && !claim.assignmentId) {
      throw new Error(`Assigned claim ${claim.id} must reference a shift assignment`);
    }
  }
  return true;
}

export const RolePermissionMap = {
  ORGANIZATION_OWNER: [
    "audit:read",
    "integration:manage",
    "user:manage",
    "ai:admin",
    "ai:use"
  ],
  SYSTEM_ADMIN: ["integration:manage", "user:manage", "ai:admin", "ai:use"],
  WORKFORCE_ADMIN: [
    "schedule:read:facility",
    "schedule:write:draft",
    "schedule:publish",
    "shift:assign",
    "shift:assign:override",
    "notification:send:facility",
    "ai:use"
  ],
  UNIT_MANAGER: [
    "schedule:read:unit",
    "shift:swap:approve",
    "shift:assign",
    "notification:send:unit",
    "timecard:read:unit",
    "ai:use"
  ],
  CHARGE_NURSE: ["schedule:read:unit", "notification:send:unit", "ai:use"],
  EMPLOYEE: [
    "schedule:read:self",
    "shift:claim",
    "shift:release",
    "shift:swap:create",
    "availability:read:self",
    "availability:write:self",
    "pto:create:self",
    "timecard:read:self",
    "timecard:write:self",
    "ai:use"
  ],
  FLOAT_POOL_COORDINATOR: [
    "schedule:read:facility",
    "shift:assign",
    "availability:read:unit",
    "credential:read",
    "ai:use"
  ],
  PAYROLL_ADMIN: ["timecard:read:unit", "timecard:resolve", "payroll:export", "ai:use"],
  CREDENTIALING_ADMIN: ["credential:read", "credential:write", "ai:use"],
  COMPLIANCE_AUDITOR: ["audit:read", "ai:use"],
  EXECUTIVE_VIEWER: ["schedule:read:facility", "ai:use"],
  EXTERNAL_AGENCY_ADMIN: ["schedule:read:self", "shift:claim", "ai:use"],
  AI_AGENT_SERVICE: ["ai:use"]
} satisfies Record<AccountRole, Permission[]>;

const IsoDateTimeSchema = z.string().datetime();
const JsonRecordSchema = z.record(z.string(), z.unknown());

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string(),
  status: OrganizationStatusSchema,
  defaultPolicySetId: z.string().optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const FacilitySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  address: z.string().optional(),
  timezone: z.string(),
  status: FacilityStatusSchema
});
export type Facility = z.infer<typeof FacilitySchema>;

export const UnitSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  name: z.string(),
  unitType: UnitTypeSchema,
  managerUserIds: z.array(z.string()),
  defaultStaffingPolicyId: z.string().optional(),
  status: FacilityStatusSchema
});
export type Unit = z.infer<typeof UnitSchema>;

export const UserSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string().email(),
  supabaseAuthId: z.string().optional(),
  phone: z.string().optional(),
  displayName: z.string(),
  authProvider: z.enum(["PASSWORD", "GOOGLE", "MICROSOFT", "SAML", "OIDC"]),
  status: UserStatusSchema,
  lastLoginAt: IsoDateTimeSchema.optional()
});
export type User = z.infer<typeof UserSchema>;

export const InvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string().email(),
  role: AccountRoleSchema,
  scope: ScopeSchema,
  status: InvitationStatusSchema,
  invitedByUserId: z.string(),
  acceptedByUserId: z.string().optional(),
  expiresAt: IsoDateTimeSchema,
  acceptedAt: IsoDateTimeSchema.optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type Invitation = z.infer<typeof InvitationSchema>;

export const AuthSessionSummarySchema = z.object({
  user: UserSchema,
  organization: OrganizationSchema,
  employeeProfile: z.unknown().optional(),
  roles: z.array(AccountRoleSchema),
  scopes: z.array(ScopeSchema),
  permissions: z.array(PermissionSchema),
  featureFlags: z.record(z.string(), z.boolean())
});
export type AuthSessionSummary = z.infer<typeof AuthSessionSummarySchema>;

export const EmployeeProfileSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  organizationId: z.string(),
  employeeNumber: z.string(),
  legalName: z.string(),
  preferredName: z.string().optional(),
  primaryFacilityId: z.string(),
  primaryUnitId: z.string(),
  employmentType: EmploymentTypeSchema,
  roleId: z.string(),
  managerUserId: z.string().optional(),
  status: EmployeeStatusSchema,
  hireDate: z.string().date().optional()
});
export type EmployeeProfile = z.infer<typeof EmployeeProfileSchema>;

export const ShiftSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  facilityId: z.string(),
  unitId: z.string(),
  templateId: z.string().optional(),
  roleRequiredId: z.string(),
  certificationRequiredIds: z.array(z.string()),
  startAt: IsoDateTimeSchema,
  endAt: IsoDateTimeSchema,
  assignedEmployeeId: z.string().optional(),
  status: ShiftStatusSchema,
  source: ShiftSourceSchema,
  riskFlags: z.array(z.string())
});
export type Shift = z.infer<typeof ShiftSchema>;

export const ShiftSwapRequestSchema = z.object({
  id: z.string(),
  requesterEmployeeId: z.string(),
  originalShiftId: z.string(),
  proposedEmployeeId: z.string().optional(),
  proposedShiftId: z.string().optional(),
  unitId: z.string(),
  status: RequestStatusSchema,
  riskFlags: z.array(z.string()),
  createdBy: z.enum(["EMPLOYEE", "MANAGER", "AI_ASSISTED"]),
  managerApprovalRequired: z.boolean()
});
export type ShiftSwapRequest = z.infer<typeof ShiftSwapRequestSchema>;

export const PolicyDecisionSchema = z.object({
  id: z.string(),
  action: z.string(),
  allowed: z.boolean(),
  requiresApproval: z.boolean(),
  riskFlags: z.array(z.string()),
  blockingReasons: z.array(z.string()),
  warnings: z.array(z.string())
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  recipientUserId: z.string(),
  channel: NotificationChannelSchema,
  type: z.string(),
  status: NotificationStatusSchema,
  category: NotificationCategorySchema.default("SYSTEM"),
  priority: NotificationPrioritySchema.default("NORMAL"),
  payload: JsonRecordSchema
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationPreferenceSchema = z.object({
  userId: z.string(),
  role: AccountRoleSchema,
  category: NotificationCategorySchema,
  channel: NotificationChannelSchema,
  enabled: z.boolean(),
  required: z.boolean(),
  priority: NotificationPrioritySchema
});
export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

type RoleNotificationDefault = Omit<NotificationPreference, "userId">;

const baseHumanNotificationDefaults: RoleNotificationDefault[] = [
  {
    role: "EMPLOYEE",
    category: "SCHEDULE",
    channel: "IN_APP",
    enabled: true,
    required: true,
    priority: "HIGH"
  },
  {
    role: "EMPLOYEE",
    category: "SWAP",
    channel: "IN_APP",
    enabled: true,
    required: true,
    priority: "HIGH"
  },
  {
    role: "EMPLOYEE",
    category: "TIMECARD",
    channel: "IN_APP",
    enabled: true,
    required: true,
    priority: "HIGH"
  },
  {
    role: "EMPLOYEE",
    category: "SYSTEM",
    channel: "EMAIL",
    enabled: true,
    required: false,
    priority: "NORMAL"
  }
];

function defaultsForRole(role: AccountRole): RoleNotificationDefault[] {
  const shared = baseHumanNotificationDefaults.map((preference) => ({ ...preference, role }));
  switch (role) {
    case "ORGANIZATION_OWNER":
    case "SYSTEM_ADMIN":
      return [
        ...shared,
        { role, category: "INTEGRATION", channel: "EMAIL", enabled: true, required: true, priority: "HIGH" },
        { role, category: "AI_SAFETY", channel: "IN_APP", enabled: true, required: true, priority: "URGENT" },
        { role, category: "SYSTEM", channel: "SMS", enabled: true, required: false, priority: "URGENT" }
      ];
    case "WORKFORCE_ADMIN":
    case "FLOAT_POOL_COORDINATOR":
      return [
        ...shared,
        { role, category: "STAFFING", channel: "IN_APP", enabled: true, required: true, priority: "HIGH" },
        { role, category: "STAFFING", channel: "EMAIL", enabled: true, required: false, priority: "HIGH" }
      ];
    case "UNIT_MANAGER":
    case "CHARGE_NURSE":
      return [
        ...shared,
        { role, category: "APPROVAL", channel: "IN_APP", enabled: true, required: true, priority: "URGENT" },
        { role, category: "STAFFING", channel: "SMS", enabled: true, required: false, priority: "URGENT" }
      ];
    case "PAYROLL_ADMIN":
      return [
        ...shared,
        { role, category: "TIMECARD", channel: "EMAIL", enabled: true, required: true, priority: "HIGH" }
      ];
    case "CREDENTIALING_ADMIN":
      return [
        ...shared,
        { role, category: "CREDENTIAL", channel: "EMAIL", enabled: true, required: true, priority: "HIGH" }
      ];
    case "COMPLIANCE_AUDITOR":
      return [
        ...shared,
        { role, category: "AI_SAFETY", channel: "IN_APP", enabled: true, required: true, priority: "HIGH" }
      ];
    case "EXECUTIVE_VIEWER":
      return [
        ...shared,
        { role, category: "STAFFING", channel: "EMAIL", enabled: true, required: false, priority: "NORMAL" }
      ];
    case "EXTERNAL_AGENCY_ADMIN":
      return [
        ...shared,
        { role, category: "STAFFING", channel: "IN_APP", enabled: true, required: true, priority: "HIGH" }
      ];
    case "AI_AGENT_SERVICE":
      return [
        { role, category: "AI_SAFETY", channel: "IN_APP", enabled: true, required: true, priority: "URGENT" },
        { role, category: "SYSTEM", channel: "IN_APP", enabled: true, required: true, priority: "HIGH" }
      ];
    case "EMPLOYEE":
    default:
      return shared;
  }
}

export const RoleNotificationPreferenceDefaults: Record<AccountRole, RoleNotificationDefault[]> =
  AccountRoleSchema.options.reduce(
    (defaults, role) => ({
      ...defaults,
      [role]: defaultsForRole(role)
    }),
    {} as Record<AccountRole, RoleNotificationDefault[]>
  );

export const AIToolCallSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  userId: z.string(),
  toolName: z.string(),
  inputJson: JsonRecordSchema,
  outputJson: JsonRecordSchema.optional(),
  status: AIToolCallStatusSchema,
  riskLevel: ToolRiskLevelSchema,
  policyDecisionId: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  route: z.string().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  estimatedCostUsd: z.number().nonnegative().optional(),
  pageContext: z.string().optional(),
  actorRole: AccountRoleSchema.optional(),
  scopeSummary: z.string().optional(),
  safetyStatus: z.enum(["SAFE", "APPROVAL_REQUIRED", "BLOCKED", "FAILED"]).optional(),
  deniedReason: z.string().optional(),
  createdAt: IsoDateTimeSchema
});
export type AIToolCall = z.infer<typeof AIToolCallSchema>;

export const AuditLogSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  actorUserId: z.string().optional(),
  actorType: ActorTypeSchema,
  action: z.string(),
  objectType: z.string(),
  objectId: z.string(),
  before: JsonRecordSchema.optional(),
  after: JsonRecordSchema.optional(),
  reason: z.string().optional(),
  ipAddress: z.string().optional(),
  createdAt: IsoDateTimeSchema
});
export type AuditLog = z.infer<typeof AuditLogSchema>;
