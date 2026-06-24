import { z } from "zod";
import {
  AccountRoleSchema,
  FacilityStatusSchema,
  InvitationStatusSchema,
  InvitationWorkforceAssignmentSchema,
  OrganizationStatusSchema,
  PermissionSchema,
  ScopeSchema,
  UnitTypeSchema,
  UserStatusSchema
} from "@pulseshift/domain";

export const AdminAuditReasonSchema = z.object({
  reason: z.string().min(3).max(500)
}).strict();

export const OrganizationSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  timezone: z.string().min(1),
  status: OrganizationStatusSchema
}).strict();

export const OrganizationSettingsUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  status: OrganizationStatusSchema.optional(),
  reason: AdminAuditReasonSchema.shape.reason
}).strict();

export const FacilityRecordSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1),
  timezone: z.string().min(1),
  status: FacilityStatusSchema
}).strict();

export const FacilityMutationSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().min(1),
  reason: AdminAuditReasonSchema.shape.reason
}).strict();

export const UnitRecordSchema = z.object({
  id: z.string().min(1),
  facilityId: z.string().min(1),
  name: z.string().min(1),
  type: UnitTypeSchema,
  managerUserIds: z.array(z.string()),
  active: z.boolean()
}).strict();

export const UnitMutationSchema = z.object({
  facilityId: z.string().min(1),
  name: z.string().min(1),
  type: UnitTypeSchema,
  managerUserIds: z.array(z.string()).default([]),
  reason: AdminAuditReasonSchema.shape.reason
}).strict();

export const AdminUserRecordSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  status: UserStatusSchema,
  roles: z.array(AccountRoleSchema)
}).strict();

export const UserStatusMutationSchema = z.object({
  status: z.enum(["SUSPENDED", "ACTIVE", "DEACTIVATED"]),
  reason: AdminAuditReasonSchema.shape.reason
}).strict();

export const RoleAssignmentSchema = z.object({
  userId: z.string().min(1),
  role: AccountRoleSchema,
  scope: ScopeSchema,
  reason: AdminAuditReasonSchema.shape.reason
}).strict();

export const DerivedRoleGrantSchema = z.object({
  role: AccountRoleSchema,
  scope: ScopeSchema,
  permissions: z.array(PermissionSchema)
}).strict();

export const InvitationRecordSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  email: z.string().email(),
  role: AccountRoleSchema,
  scope: ScopeSchema,
  status: InvitationStatusSchema,
  invitedByUserId: z.string().min(1),
  acceptedByUserId: z.string().optional()
}).strict();

export const InvitationMutationSchema = z.object({
  email: z.string().email(),
  role: AccountRoleSchema,
  selection: z
    .object({
      facilityIds: z.array(z.string().min(1)).optional(),
      unitIds: z.array(z.string().min(1)).optional()
    })
    .strict(),
  workforceAssignment: InvitationWorkforceAssignmentSchema.optional(),
  reason: AdminAuditReasonSchema.shape.reason
}).strict();

export type OrganizationSummary = z.infer<typeof OrganizationSummarySchema>;
export type OrganizationSettingsUpdate = z.infer<typeof OrganizationSettingsUpdateSchema>;
export type FacilityRecord = z.infer<typeof FacilityRecordSchema>;
export type FacilityMutation = z.infer<typeof FacilityMutationSchema>;
export type UnitRecord = z.infer<typeof UnitRecordSchema>;
export type UnitMutation = z.infer<typeof UnitMutationSchema>;
export type AdminUserRecord = z.infer<typeof AdminUserRecordSchema>;
export type UserStatusMutation = z.infer<typeof UserStatusMutationSchema>;
export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>;
export type DerivedRoleGrant = z.infer<typeof DerivedRoleGrantSchema>;
export type InvitationRecord = z.infer<typeof InvitationRecordSchema>;
export type InvitationMutation = z.infer<typeof InvitationMutationSchema>;

export interface OrganizationAdminServiceContract {
  getSummary(organizationId: string): Promise<OrganizationSummary>;
  updateSettings(organizationId: string, input: OrganizationSettingsUpdate): Promise<OrganizationSummary>;
}

export interface FacilityAdminServiceContract {
  list(organizationId: string): Promise<FacilityRecord[]>;
  create(organizationId: string, input: FacilityMutation): Promise<FacilityRecord>;
  update(organizationId: string, facilityId: string, input: FacilityMutation): Promise<FacilityRecord>;
  deactivate(organizationId: string, facilityId: string, reason: string): Promise<FacilityRecord>;
}

export interface UnitAdminServiceContract {
  list(organizationId: string, facilityId?: string): Promise<UnitRecord[]>;
  create(organizationId: string, input: UnitMutation): Promise<UnitRecord>;
  update(organizationId: string, unitId: string, input: UnitMutation): Promise<UnitRecord>;
  assignManagers(organizationId: string, unitId: string, managerUserIds: string[], reason: string): Promise<UnitRecord>;
  deactivate(organizationId: string, unitId: string, reason: string): Promise<UnitRecord>;
}

export interface UserAdminServiceContract {
  list(organizationId: string): Promise<AdminUserRecord[]>;
  detail(organizationId: string, userId: string): Promise<AdminUserRecord>;
  updateStatus(organizationId: string, userId: string, input: UserStatusMutation): Promise<AdminUserRecord>;
}

export interface RoleAdminServiceContract {
  assignRole(organizationId: string, input: RoleAssignment): Promise<DerivedRoleGrant>;
  updateScope(organizationId: string, input: RoleAssignment): Promise<DerivedRoleGrant>;
  removeRole(organizationId: string, userId: string, role: z.infer<typeof AccountRoleSchema>, reason: string): Promise<void>;
}

export interface InvitationAdminServiceContract {
  list(organizationId: string): Promise<InvitationRecord[]>;
  revoke(organizationId: string, invitationId: string, reason: string): Promise<InvitationRecord>;
  resendMetadata(organizationId: string, invitationId: string, reason: string): Promise<InvitationRecord>;
}

export function assertAdminContractsSafe() {
  const forbiddenKeys = new Set(["permissions", "rawPermissions", "sql", "rawSql"]);
  const schemas = [RoleAssignmentSchema, InvitationMutationSchema, UserStatusMutationSchema];
  for (const schema of schemas) {
    const keys = Object.keys(schema.shape);
    for (const key of keys) {
      if (key !== "permissions" && forbiddenKeys.has(key)) {
        throw new Error(`Unsafe admin contract key: ${key}`);
      }
    }
  }
  return true;
}
