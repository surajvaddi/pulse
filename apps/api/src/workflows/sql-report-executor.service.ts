import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  RequestTimeoutException
} from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import type { WorkspaceContext } from "../auth/workspace-context.service";
import { WorkspaceContextService } from "../auth/workspace-context.service";
import {
  getSqlReportDefinition,
  type RegisteredSqlReport
} from "./sql-report.registry";
import type { SqlReportName } from "./repository-contracts";

function isSelfOnly(session: DemoSession) {
  return (
    session.grants.some((grant) => grant.scope.type === "SELF") &&
    !session.grants.some((grant) =>
      ["UNIT", "FACILITY", "ORG"].includes(grant.scope.type)
    )
  );
}

export function normalizeSqlReportParams(
  session: DemoSession,
  context: WorkspaceContext,
  name: SqlReportName,
  params: Record<string, unknown>
) {
  const normalized = { ...params };
  if (typeof normalized.unitId === "string") {
    if (!context.units.some((unit) => unit.id === normalized.unitId)) {
      throw new ForbiddenException("Report unit is outside the actor's scope.");
    }
  } else if (context.activeSelection.unitId) {
    normalized.unitId = context.activeSelection.unitId;
  }
  if (
    isSelfOnly(session) &&
    ["get_employee_schedule_report", "get_timecard_exceptions_report"].includes(name)
  ) {
    normalized.userId = session.userId;
    delete normalized.employeeId;
  }
  delete normalized.organizationId;
  delete normalized.actorUserId;
  return normalized;
}

@Injectable()
export class SqlReportExecutorService {
  constructor(private readonly workspaceContext: WorkspaceContextService) {}

  async executeSqlReport(
    session: DemoSession,
    name: SqlReportName,
    params: Record<string, unknown>
  ) {
    const report = getSqlReportDefinition(name) as
      | RegisteredSqlReport<Record<string, unknown>, unknown[]>
      | undefined;
    if (!report) throw new NotFoundException(`Unknown SQL report: ${name}`);
    if (
      !session.grants.some(
        (grant) => grant.permission === report.requiredPermission
      )
    ) {
      throw new ForbiddenException("Report is outside the actor's permissions.");
    }
    const context = await this.workspaceContext.getContext(session);
    const validated = report.validateParams(
      normalizeSqlReportParams(session, context, name, params)
    );
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new RequestTimeoutException("SQL report timed out.")),
        report.timeoutMs
      );
    });
    const rows = await Promise.race([
      report.run(
        {
          organizationId: session.organizationId,
          actorUserId: session.userId,
          permissions: session.grants.map((grant) => grant.permission),
          scopes: session.grants.map((grant) => grant.scope),
          limit: report.maxRows,
          timeoutMs: report.timeoutMs
        },
        validated
      ),
      timeout
    ]);
    return rows.slice(0, report.maxRows);
  }
}
