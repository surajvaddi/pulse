import assert from "node:assert/strict";

import {
  assertLlmSqlToolsSafe,
  getLlmSqlReportTool,
  llmSqlReportTools,
  llmSqlToolRegistry
} from "./llm-sql-tool.registry";

assert.equal(assertLlmSqlToolsSafe(), true);
assert.equal(llmSqlReportTools.length, 5);

const staffing = getLlmSqlReportTool("get_staffing_gaps_report");
assert.ok(staffing);
assert.equal(staffing.usesSqlReport, true);
assert.equal(staffing.allowsMutation, false);
assert.equal(staffing.roleAccess.UNIT_MANAGER, "ALLOWED");
assert.equal(staffing.roleAccess.EMPLOYEE, "BLOCKED");
assert.throws(() => staffing.inputSchema.parse({ rawSql: "select * from shifts" }));

const schedule = getLlmSqlReportTool("get_employee_schedule_report");
assert.ok(schedule);
assert.equal(schedule.roleAccess.EMPLOYEE, "ALLOWED");
assert.equal(schedule.roleAccess.EXTERNAL_AGENCY_ADMIN, "READ_ONLY");

const audit = getLlmSqlReportTool("get_audit_activity_report");
assert.ok(audit);
assert.equal(audit.roleAccess.COMPLIANCE_AUDITOR, "READ_ONLY");
assert.equal(audit.roleAccess.PAYROLL_ADMIN, "BLOCKED");

assert.equal(
  llmSqlToolRegistry.availableFor(
    { role: "UNIT_MANAGER", currentPage: "/app/staffing-gaps" },
    "SQL_REPORT_SUMMARY"
  ).length > 0,
  true
);
assert.equal(
  llmSqlToolRegistry.availableFor(
    { role: "EMPLOYEE", currentPage: "/app/staffing-gaps" },
    "SQL_REPORT_SUMMARY"
  ).some((tool) => tool.name === "get_staffing_gaps_report"),
  false
);
