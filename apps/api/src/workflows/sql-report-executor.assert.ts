import assert from "node:assert/strict";

import { demoSessions } from "../auth/demo-users";
import type { WorkspaceContext } from "../auth/workspace-context.service";
import { normalizeSqlReportParams } from "./sql-report-executor.service";
import { listSqlReports } from "./sql-report.registry";

assert.equal(listSqlReports().length, 5);
const employee = demoSessions.find((session) => session.role === "EMPLOYEE");
assert.ok(employee);
const context: WorkspaceContext = {
  facilities: [{ id: "fac_1", name: "Main" }],
  units: [{ id: "unit_1", name: "ICU", facilityId: "fac_1" }],
  defaultSelection: { facilityId: "fac_1", unitId: "unit_1" },
  activeSelection: { facilityId: "fac_1", unitId: "unit_1" },
  roleGrants: employee.grants
};
assert.deepEqual(
  normalizeSqlReportParams(
    employee,
    context,
    "get_employee_schedule_report",
    { userId: "attacker", organizationId: "other" }
  ),
  { userId: employee.userId, unitId: "unit_1" }
);
assert.throws(
  () =>
    normalizeSqlReportParams(employee, context, "get_employee_schedule_report", {
      unitId: "unit_other"
    }),
  /outside/
);

console.log("SQL report executor assertions passed");
