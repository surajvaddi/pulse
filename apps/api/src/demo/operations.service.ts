import { Inject, Injectable } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { AuditService } from "./audit.service";
import { OperationsRepositoryProvider } from "./operations.repository";

@Injectable()
export class OperationsService {
  constructor(
    @Inject(OperationsRepositoryProvider) private readonly repositories: OperationsRepositoryProvider,
    @Inject(AuditService) private readonly auditLogs: AuditService
  ) {}

  staffingGaps(session: DemoSession) {
    return this.repositories.repository().listStaffingGaps({
      organizationId: session.organizationId
    });
  }

  async coverageCandidates(session: DemoSession, gapId: string) {
    return {
      gapId,
      candidates: await this.repositories.repository().listCoverageCandidates({
        organizationId: session.organizationId,
        gapId
      })
    };
  }

  credentialWarnings(session: DemoSession) {
    return this.repositories.repository().listCredentialWarnings({
      organizationId: session.organizationId
    });
  }

  staffDirectory(session: DemoSession) {
    return this.repositories.repository().listStaff({
      organizationId: session.organizationId,
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
