import { Injectable } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { redactValue } from "./log-redaction";

export type MonitoringSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export type MonitoringEvent = {
  id: string;
  name: string;
  severity: MonitoringSeverity;
  createdAt: string;
  requestId?: string | undefined;
  organizationId?: string | undefined;
  actorUserId?: string | undefined;
  actorRole?: string | undefined;
  scopeSummary?: string | undefined;
  route?: string | undefined;
  metadata: Record<string, unknown>;
};

@Injectable()
export class MonitoringService {
  private readonly events: MonitoringEvent[] = [];

  emit(input: Omit<MonitoringEvent, "id" | "createdAt" | "metadata"> & { metadata?: Record<string, unknown> | undefined }) {
    const event: MonitoringEvent = {
      ...input,
      id: `monitor_${this.events.length + 1}`,
      createdAt: new Date().toISOString(),
      metadata: (redactValue(input.metadata ?? {}) ?? {}) as Record<string, unknown>
    };
    this.events.push(event);
    return event;
  }

  emitForSession(input: {
    name: string;
    severity: MonitoringSeverity;
    session?: DemoSession | undefined;
    requestId?: string | undefined;
    route?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
  }) {
    return this.emit({
      name: input.name,
      severity: input.severity,
      requestId: input.requestId,
      route: input.route,
      ...(input.session
        ? {
            organizationId: input.session.organizationId,
            actorUserId: input.session.userId,
            actorRole: input.session.role,
            scopeSummary: [...new Set(input.session.grants.map((grant) => grant.scope.type))].sort().join(",")
          }
        : {}),
      metadata: input.metadata
    });
  }

  list() {
    return [...this.events];
  }

  reset() {
    this.events.splice(0, this.events.length);
  }
}
