import { z } from "zod";
import { Prisma, prisma } from "@pulseshift/db";

import type {
  SqlReportContext,
  SqlReportDefinition,
  SqlReportName
} from "./repository-contracts";

export type StaffingGapsReportRow = {
  unitId: string;
  role: string;
  requiredCount: number;
  assignedCount: number;
  gapCount: number;
  severity: string;
};

export type EmployeeScheduleReportRow = {
  shiftId: string;
  employeeId: string | null;
  userId: string | null;
  unitId: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
};

export type TimecardExceptionsReportRow = {
  exceptionId: string;
  employeeId: string;
  userId: string | null;
  unitId: string;
  type: string;
  severity: string;
  status: string;
  createdAt: Date;
};

export type CredentialExpiryReportRow = {
  employeeId: string;
  employeeName: string;
  certification: string;
  status: string;
  expiresAt: Date | null;
};

export type AuditActivityReportRow = {
  auditId: string;
  actorUserId: string | null;
  actorType: string;
  action: string;
  objectType: string;
  createdAt: Date;
};

export type SqlReportColumn = {
  key: string;
  type: "string" | "number" | "boolean" | "datetime" | "string[]";
};

export type RegisteredSqlReport<TParams extends Record<string, unknown>, TResult> =
  SqlReportDefinition<TParams, TResult> & {
    description: string;
    parameterSchema: z.ZodType<TParams>;
    resultColumns: SqlReportColumn[];
    parameterKeys: string[];
  };

const isoDateRangeSchema = {
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional()
};

const unitFilterSchema = z.object({
  unitId: z.string().min(1).optional()
});

const reportSchemas = {
  staffing: unitFilterSchema.strict(),
  schedule: z.object({
    employeeId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    unitId: z.string().min(1).optional(),
    ...isoDateRangeSchema
  }).strict(),
  timecard: z.object({
    userId: z.string().min(1).optional(),
    unitId: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    ...isoDateRangeSchema
  }).strict(),
  credential: z.object({
    unitId: z.string().min(1).optional(),
    expiresBefore: z.string().datetime().optional()
  }).strict(),
  audit: z.object({
    actorUserId: z.string().min(1).optional(),
    action: z.string().min(1).optional(),
    ...isoDateRangeSchema
  }).strict()
};

type StaffingGapsReportParams = z.infer<typeof reportSchemas.staffing>;
type EmployeeScheduleReportParams = z.infer<typeof reportSchemas.schedule>;
type TimecardExceptionsReportParams = z.infer<typeof reportSchemas.timecard>;
type CredentialExpiryReportParams = z.infer<typeof reportSchemas.credential>;
type AuditActivityReportParams = z.infer<typeof reportSchemas.audit>;

function notImplementedReport(name: SqlReportName) {
  return async (_context: SqlReportContext, _params: Record<string, unknown>) => {
    throw new Error(`${name} is registered but not implemented yet`);
  };
}

async function runStaffingGapsReport(
  context: SqlReportContext,
  params: StaffingGapsReportParams
): Promise<StaffingGapsReportRow[]> {
  const effectiveLimit = Math.min(context.limit, 100);
  return prisma.$queryRaw<StaffingGapsReportRow[]>(Prisma.sql`
    SELECT
      s."unitId" AS "unitId",
      wr.name AS "role",
      COUNT(*)::int AS "requiredCount",
      0::int AS "assignedCount",
      COUNT(*)::int AS "gapCount",
      CASE
        WHEN COUNT(*) >= 2 THEN 'CRITICAL'
        ELSE 'HIGH'
      END AS "severity"
    FROM shifts s
    INNER JOIN workforce_roles wr ON wr.id = s."roleRequiredId"
    WHERE s."organizationId" = ${context.organizationId}
      AND s.status = 'OPEN'
      AND (${params.unitId ?? null}::text IS NULL OR s."unitId" = ${params.unitId ?? null})
    GROUP BY s."unitId", wr.name
    ORDER BY "gapCount" DESC, s."unitId" ASC, wr.name ASC
    LIMIT ${effectiveLimit}
  `);
}

async function runEmployeeScheduleReport(
  context: SqlReportContext,
  params: EmployeeScheduleReportParams
): Promise<EmployeeScheduleReportRow[]> {
  const effectiveLimit = Math.min(context.limit, 250);
  return prisma.$queryRaw<EmployeeScheduleReportRow[]>(Prisma.sql`
    SELECT
      s.id AS "shiftId",
      s."assignedEmployeeId" AS "employeeId",
      ep."userId" AS "userId",
      s."unitId" AS "unitId",
      s."startAt" AS "startsAt",
      s."endAt" AS "endsAt",
      s.status AS "status"
    FROM shifts s
    LEFT JOIN employee_profiles ep ON ep.id = s."assignedEmployeeId"
    WHERE s."organizationId" = ${context.organizationId}
      AND (${params.employeeId ?? null}::text IS NULL OR s."assignedEmployeeId" = ${params.employeeId ?? null})
      AND (${params.userId ?? null}::text IS NULL OR ep."userId" = ${params.userId ?? null})
      AND (${params.unitId ?? null}::text IS NULL OR s."unitId" = ${params.unitId ?? null})
      AND (${params.startsAt ?? null}::timestamptz IS NULL OR s."startAt" >= ${params.startsAt ?? null}::timestamptz)
      AND (${params.endsAt ?? null}::timestamptz IS NULL OR s."endAt" <= ${params.endsAt ?? null}::timestamptz)
    ORDER BY s."startAt" ASC, s.id ASC
    LIMIT ${effectiveLimit}
  `);
}

async function runTimecardExceptionsReport(
  context: SqlReportContext,
  params: TimecardExceptionsReportParams
): Promise<TimecardExceptionsReportRow[]> {
  const effectiveLimit = Math.min(context.limit, 250);
  return prisma.$queryRaw<TimecardExceptionsReportRow[]>(Prisma.sql`
    SELECT
      te.id AS "exceptionId",
      te."employeeId" AS "employeeId",
      ep."userId" AS "userId",
      ep."primaryUnitId" AS "unitId",
      te."exceptionType" AS "type",
      te.severity AS "severity",
      te.status AS "status",
      te."createdAt" AS "createdAt"
    FROM timecard_exceptions te
    INNER JOIN employee_profiles ep ON ep.id = te."employeeId"
    WHERE ep."organizationId" = ${context.organizationId}
      AND (${params.userId ?? null}::text IS NULL OR ep."userId" = ${params.userId ?? null})
      AND (${params.unitId ?? null}::text IS NULL OR ep."primaryUnitId" = ${params.unitId ?? null})
      AND (${params.status ?? null}::text IS NULL OR te.status = ${params.status ?? null})
      AND (${params.startsAt ?? null}::timestamptz IS NULL OR te."createdAt" >= ${params.startsAt ?? null}::timestamptz)
      AND (${params.endsAt ?? null}::timestamptz IS NULL OR te."createdAt" <= ${params.endsAt ?? null}::timestamptz)
    ORDER BY te."createdAt" DESC, te.id ASC
    LIMIT ${effectiveLimit}
  `);
}

async function runCredentialExpiryReport(
  context: SqlReportContext,
  params: CredentialExpiryReportParams
): Promise<CredentialExpiryReportRow[]> {
  const effectiveLimit = Math.min(context.limit, 250);
  return prisma.$queryRaw<CredentialExpiryReportRow[]>(Prisma.sql`
    SELECT
      ep.id AS "employeeId",
      COALESCE(ep."preferredName", ep."legalName") AS "employeeName",
      c.name AS "certification",
      ec.status AS "status",
      ec."expiresAt" AS "expiresAt"
    FROM employee_certifications ec
    INNER JOIN employee_profiles ep ON ep.id = ec."employeeId"
    INNER JOIN certifications c ON c.id = ec."certificationId"
    WHERE ep."organizationId" = ${context.organizationId}
      AND (${params.unitId ?? null}::text IS NULL OR ep."primaryUnitId" = ${params.unitId ?? null})
      AND (
        ec.status <> 'VERIFIED'
        OR (${params.expiresBefore ?? null}::timestamptz IS NOT NULL AND ec."expiresAt" <= ${params.expiresBefore ?? null}::timestamptz)
      )
    ORDER BY ec."expiresAt" ASC NULLS LAST, ep."legalName" ASC, c.name ASC
    LIMIT ${effectiveLimit}
  `);
}

async function runAuditActivityReport(
  context: SqlReportContext,
  params: AuditActivityReportParams
): Promise<AuditActivityReportRow[]> {
  const effectiveLimit = Math.min(context.limit, 250);
  return prisma.$queryRaw<AuditActivityReportRow[]>(Prisma.sql`
    SELECT
      al.id AS "auditId",
      al."actorUserId" AS "actorUserId",
      al."actorType" AS "actorType",
      al.action AS "action",
      al."objectType" AS "objectType",
      al."createdAt" AS "createdAt"
    FROM audit_logs al
    WHERE al."organizationId" = ${context.organizationId}
      AND (${params.actorUserId ?? null}::text IS NULL OR al."actorUserId" = ${params.actorUserId ?? null})
      AND (${params.action ?? null}::text IS NULL OR al.action = ${params.action ?? null})
      AND (${params.startsAt ?? null}::timestamptz IS NULL OR al."createdAt" >= ${params.startsAt ?? null}::timestamptz)
      AND (${params.endsAt ?? null}::timestamptz IS NULL OR al."createdAt" <= ${params.endsAt ?? null}::timestamptz)
    ORDER BY al."createdAt" DESC, al.id ASC
    LIMIT ${effectiveLimit}
  `);
}

function defineReport<TParams extends Record<string, unknown>, TResult>(input: {
  name: SqlReportName;
  description: string;
  requiredPermission: RegisteredSqlReport<TParams, TResult>["requiredPermission"];
  maxRows: number;
  timeoutMs: number;
  parameterSchema: z.ZodType<TParams>;
  resultColumns: SqlReportColumn[];
  run?: RegisteredSqlReport<TParams, TResult>["run"];
}): RegisteredSqlReport<TParams, TResult> {
  const objectSchema = input.parameterSchema as unknown as z.ZodObject<z.ZodRawShape>;
  const parameterKeys = Object.keys(objectSchema.shape);
  return {
    ...input,
    parameterKeys,
    validateParams(params: unknown) {
      return input.parameterSchema.parse(params);
    },
    run: input.run ?? notImplementedReport(input.name)
  };
}

export const sqlReportRegistry = [
  defineReport({
    name: "get_staffing_gaps_report",
    description: "Returns staffing gaps by unit and role for the current organization.",
    requiredPermission: "schedule:read:unit",
    maxRows: 100,
    timeoutMs: 1500,
    parameterSchema: reportSchemas.staffing,
    run: runStaffingGapsReport,
    resultColumns: [
      { key: "unitId", type: "string" },
      { key: "role", type: "string" },
      { key: "requiredCount", type: "number" },
      { key: "assignedCount", type: "number" },
      { key: "gapCount", type: "number" },
      { key: "severity", type: "string" }
    ]
  }),
  defineReport({
    name: "get_employee_schedule_report",
    description: "Returns bounded employee schedule rows for self or scoped unit review.",
    requiredPermission: "schedule:read:self",
    maxRows: 250,
    timeoutMs: 1500,
    parameterSchema: reportSchemas.schedule,
    run: runEmployeeScheduleReport,
    resultColumns: [
      { key: "shiftId", type: "string" },
      { key: "employeeId", type: "string" },
      { key: "unitId", type: "string" },
      { key: "startsAt", type: "datetime" },
      { key: "endsAt", type: "datetime" },
      { key: "status", type: "string" }
    ]
  }),
  defineReport({
    name: "get_timecard_exceptions_report",
    description: "Returns scoped timecard exceptions for payroll and manager review.",
    requiredPermission: "timecard:read:unit",
    maxRows: 250,
    timeoutMs: 1500,
    parameterSchema: reportSchemas.timecard,
    run: runTimecardExceptionsReport,
    resultColumns: [
      { key: "exceptionId", type: "string" },
      { key: "employeeId", type: "string" },
      { key: "unitId", type: "string" },
      { key: "type", type: "string" },
      { key: "severity", type: "string" },
      { key: "status", type: "string" }
    ]
  }),
  defineReport({
    name: "get_credential_expiry_report",
    description: "Returns scoped credential warnings and expiry risk rows.",
    requiredPermission: "credential:read",
    maxRows: 250,
    timeoutMs: 1500,
    parameterSchema: reportSchemas.credential,
    run: runCredentialExpiryReport,
    resultColumns: [
      { key: "employeeId", type: "string" },
      { key: "employeeName", type: "string" },
      { key: "certification", type: "string" },
      { key: "status", type: "string" },
      { key: "expiresAt", type: "datetime" }
    ]
  }),
  defineReport({
    name: "get_audit_activity_report",
    description: "Returns bounded audit activity for organization administrators.",
    requiredPermission: "audit:read",
    maxRows: 250,
    timeoutMs: 1500,
    parameterSchema: reportSchemas.audit,
    run: runAuditActivityReport,
    resultColumns: [
      { key: "auditId", type: "string" },
      { key: "actorUserId", type: "string" },
      { key: "actorType", type: "string" },
      { key: "action", type: "string" },
      { key: "objectType", type: "string" },
      { key: "createdAt", type: "datetime" }
    ]
  })
] as const;

export function listSqlReports() {
  return sqlReportRegistry.map((report) => report.name);
}

export function getSqlReportDefinition(name: SqlReportName) {
  return sqlReportRegistry.find((report) => report.name === name);
}

export function assertSqlReportRegistrySafe() {
  const forbiddenKeys = new Set(["sql", "query", "rawSql", "rawQuery", "statement"]);
  for (const report of sqlReportRegistry) {
    for (const key of report.parameterKeys) {
      if (forbiddenKeys.has(key)) {
        throw new Error(`Unsafe SQL report parameter key: ${report.name}.${key}`);
      }
    }
  }
  return true;
}
