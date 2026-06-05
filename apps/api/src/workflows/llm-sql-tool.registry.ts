import { z } from "zod";
import {
  LlmToolRegistry,
  roleAccessFor,
  type LlmToolDefinition,
  type LlmAccountRole,
  type LlmToolRoleAccess
} from "@pulseshift/ai";

import { sqlReportRegistry } from "./sql-report.registry";
import type { SqlReportName } from "./repository-contracts";

const reportRoleAccess: Record<SqlReportName, Partial<Record<LlmAccountRole, LlmToolRoleAccess>>> = {
  get_staffing_gaps_report: {
    UNIT_MANAGER: "ALLOWED",
    CHARGE_NURSE: "READ_ONLY",
    WORKFORCE_ADMIN: "ALLOWED",
    FLOAT_POOL_COORDINATOR: "ALLOWED",
    EXECUTIVE_VIEWER: "READ_ONLY",
    SYSTEM_ADMIN: "READ_ONLY",
    ORGANIZATION_OWNER: "READ_ONLY"
  },
  get_employee_schedule_report: {
    EMPLOYEE: "ALLOWED",
    EXTERNAL_AGENCY_ADMIN: "READ_ONLY",
    UNIT_MANAGER: "READ_ONLY",
    CHARGE_NURSE: "READ_ONLY",
    WORKFORCE_ADMIN: "READ_ONLY",
    SYSTEM_ADMIN: "READ_ONLY",
    ORGANIZATION_OWNER: "READ_ONLY"
  },
  get_timecard_exceptions_report: {
    PAYROLL_ADMIN: "ALLOWED",
    UNIT_MANAGER: "READ_ONLY",
    SYSTEM_ADMIN: "READ_ONLY",
    ORGANIZATION_OWNER: "READ_ONLY"
  },
  get_credential_expiry_report: {
    CREDENTIALING_ADMIN: "ALLOWED",
    UNIT_MANAGER: "READ_ONLY",
    WORKFORCE_ADMIN: "READ_ONLY",
    SYSTEM_ADMIN: "READ_ONLY",
    ORGANIZATION_OWNER: "READ_ONLY"
  },
  get_audit_activity_report: {
    COMPLIANCE_AUDITOR: "READ_ONLY",
    SYSTEM_ADMIN: "ALLOWED",
    ORGANIZATION_OWNER: "ALLOWED"
  }
};

const reportScopeRequirement: Record<SqlReportName, LlmToolDefinition["scopeRequirement"]> = {
  get_staffing_gaps_report: "UNIT",
  get_employee_schedule_report: "SELF",
  get_timecard_exceptions_report: "UNIT",
  get_credential_expiry_report: "ORG",
  get_audit_activity_report: "ORG"
};

export const llmSqlReportTools: LlmToolDefinition[] = sqlReportRegistry.map((report) => ({
  name: report.name,
  description: report.description,
  routeAvailability: ["SQL_REPORT_SUMMARY", "MANAGER_OPERATIONS", "SELF_SERVICE_CHAT"],
  pageContexts: ["*", "/app/copilot", "/app/schedule", "/app/staffing-gaps", "/app/timecards"],
  inputSchema: report.parameterSchema as z.ZodType<unknown>,
  outputSchema: z.array(z.record(z.unknown())),
  riskLevel: "READ_ONLY",
  scopeRequirement: reportScopeRequirement[report.name],
  roleAccess: roleAccessFor(reportRoleAccess[report.name]),
  auditEvent: `llm.sql_report.${report.name}`,
  usesSqlReport: true,
  allowsMutation: false
}));

export const llmSqlToolRegistry = new LlmToolRegistry(llmSqlReportTools);

export function getLlmSqlReportTool(name: SqlReportName) {
  return llmSqlReportTools.find((tool) => tool.name === name);
}

export function assertLlmSqlToolsSafe() {
  llmSqlToolRegistry.assertSafe();
  for (const tool of llmSqlReportTools) {
    if (!tool.usesSqlReport || tool.allowsMutation) {
      throw new Error(`SQL report tool must be read-only: ${tool.name}`);
    }
    const paramKeys = Object.keys((tool.inputSchema as z.ZodObject<z.ZodRawShape>).shape);
    for (const key of paramKeys) {
      if (["sql", "query", "rawSql", "rawQuery", "statement"].includes(key)) {
        throw new Error(`Unsafe SQL report tool parameter: ${tool.name}.${key}`);
      }
    }
  }
  return true;
}
