import { Inject, Injectable } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { AuditService } from "./audit.service";
import { OperationsRepositoryProvider } from "./operations.repository";
import { WorkspaceContextService } from "../auth/workspace-context.service";
import { scopeQueryForSession } from "../auth/scope-query";

@Injectable()
export class OperationsService {
  constructor(
    @Inject(OperationsRepositoryProvider) private readonly repositories: OperationsRepositoryProvider,
    @Inject(AuditService) private readonly auditLogs: AuditService,
    @Inject(WorkspaceContextService)
    private readonly workspaceContext: WorkspaceContextService
  ) {}

  async staffingGaps(session: DemoSession) {
    const query = scopeQueryForSession(
      session,
      await this.workspaceContext.getContext(session),
      "staffing"
    );
    return this.repositories.repository().listStaffingGaps({
      organizationId: query.organizationId,
      ...(query.unitId ? { unitId: query.unitId } : {})
    });
  }

  async coverageCandidates(session: DemoSession, gapId: string) {
    const gaps = await this.staffingGaps(session);
    if (!gaps.some((gap) => gap.id === gapId)) {
      return { gapId, candidates: [] };
    }
    return {
      gapId,
      candidates: await this.repositories.repository().listCoverageCandidates({
        organizationId: session.organizationId,
        gapId
      })
    };
  }

  async credentialWarnings(session: DemoSession) {
    const query = scopeQueryForSession(
      session,
      await this.workspaceContext.getContext(session),
      "staff"
    );
    return this.repositories.repository().listCredentialWarnings({
      organizationId: query.organizationId,
      ...(query.unitId ? { unitId: query.unitId } : {})
    });
  }

  async staffDirectory(session: DemoSession) {
    const query = scopeQueryForSession(
      session,
      await this.workspaceContext.getContext(session),
      "staff"
    );
    return this.repositories.repository().listStaff({
      organizationId: query.organizationId,
      ...(query.unitId ? { unitId: query.unitId } : {}),
      limitedView: session.role === "EMPLOYEE"
    });
  }

  timecardExceptions(session: DemoSession) {
    const unitScope = session.grants.find((grant) => grant.permission === "timecard:read:unit" && grant.scope.type === "UNIT");
    const unitId = unitScope?.scope.type === "UNIT" ? unitScope.scope.unitIds.at(0) : undefined;
    return this.repositories.repository().listTimecardExceptions(
      unitId
        ? { organizationId: session.organizationId, unitId }
        : { organizationId: session.organizationId, userId: session.userId }
    );
  }

  async resolveTimecard(session: DemoSession, exceptionId: string, resolution?: string) {
    const resolved = await this.repositories.repository().resolveTimecardException({
      organizationId: session.organizationId,
      exceptionId,
      resolution: resolution ?? "Resolved through payroll queue"
    });
    if (resolved.status !== "NOT_FOUND") {
      await this.auditLogs.append({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorType: "USER",
        action: "timecard.exception_resolved",
        objectType: "TimecardException",
        objectId: exceptionId,
        reason: resolution ?? "Resolved through payroll queue",
        after: { status: resolved.status }
      });
    }
    return resolved;
  }
}
