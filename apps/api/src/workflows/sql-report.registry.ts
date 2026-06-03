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
