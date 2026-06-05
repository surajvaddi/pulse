import { Injectable } from "@nestjs/common";

export type StructuredRequestLog = {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  organizationId?: string;
  actorUserId?: string;
  actorRole?: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class RequestLoggingService {
  private readonly records: StructuredRequestLog[] = [];

  append(record: StructuredRequestLog) {
    this.records.push(record);
  }

  list() {
    return [...this.records];
  }

  reset() {
    this.records.splice(0, this.records.length);
  }
}
