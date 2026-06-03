import { Inject, Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";

import { demoAuditLogs, type DemoAuditLogRecord } from "./demo-data";
import type { AuditLogInput, AuditRepository } from "../workflows/repository-contracts";

type PrismaAuditRecord = {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  actorType: "USER" | "AI_AGENT" | "SYSTEM" | "INTEGRATION";
  action: string;
  objectType: string;
  objectId: string;
  reason: string | null;
  after: unknown;
  createdAt: Date;
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type PrismaJsonInputValue = Exclude<JsonValue, null>;

function persistenceEnabled() {
  return process.env.WORKFLOW_PERSISTENCE === "prisma";
}

function mapJsonObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function toJsonValue(value: unknown): PrismaJsonInputValue {
  return (JSON.parse(JSON.stringify(value)) ?? {}) as PrismaJsonInputValue;
}

function mapAuditRecord(record: PrismaAuditRecord): DemoAuditLogRecord {
  const audit: DemoAuditLogRecord = {
    id: record.id,
    organizationId: record.organizationId,
    actorType: record.actorType,
    action: record.action,
    objectType: record.objectType,
    objectId: record.objectId,
    createdAt: record.createdAt.toISOString()
  };
  if (record.actorUserId) {
    audit.actorUserId = record.actorUserId;
  }
  if (record.reason) {
    audit.reason = record.reason;
  }
  const after = mapJsonObject(record.after);
  if (after) {
    audit.after = after;
  }
  return audit;
}

@Injectable()
export class InMemoryAuditRepository implements AuditRepository {
  async append(input: AuditLogInput) {
    const record: DemoAuditLogRecord = {
      id: `audit_${demoAuditLogs.length + 1}`,
      organizationId: input.organizationId,
      actorType: input.actorType,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      createdAt: new Date().toISOString()
    };
    if (input.actorUserId) {
      record.actorUserId = input.actorUserId;
    }
    if (input.reason) {
      record.reason = input.reason;
    }
    if (input.after) {
      record.after = input.after;
    }
    demoAuditLogs.push(record);
    return record;
  }

  async list(query: {
    organizationId: string;
    actorUserId?: string;
    action?: string;
    startsAt?: string;
    endsAt?: string;
    limit?: number;
  }) {
    return demoAuditLogs
      .filter((record) => {
        if (record.organizationId !== query.organizationId) {
          return false;
        }
        if (query.actorUserId && record.actorUserId !== query.actorUserId) {
          return false;
        }
        if (query.action && record.action !== query.action) {
          return false;
        }
        if (query.startsAt && record.createdAt < query.startsAt) {
          return false;
        }
        if (query.endsAt && record.createdAt > query.endsAt) {
          return false;
        }
        return true;
      })
      .slice(0, query.limit);
  }
}

@Injectable()
export class PrismaAuditRepository implements AuditRepository {
  async append(input: AuditLogInput) {
    const record = await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorType: input.actorType,
        action: input.action,
        objectType: input.objectType,
        objectId: input.objectId,
        ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.after ? { after: toJsonValue(input.after) } : {})
      }
    });
    return mapAuditRecord(record);
  }

  async list(query: {
    organizationId: string;
    actorUserId?: string;
    action?: string;
    startsAt?: string;
    endsAt?: string;
    limit?: number;
  }) {
    const records = await prisma.auditLog.findMany({
      where: {
        organizationId: query.organizationId,
        ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.startsAt || query.endsAt
          ? {
              createdAt: {
                ...(query.startsAt ? { gte: new Date(query.startsAt) } : {}),
                ...(query.endsAt ? { lte: new Date(query.endsAt) } : {})
              }
            }
          : {})
      },
      orderBy: { createdAt: "asc" },
      ...(query.limit ? { take: query.limit } : {})
    });
    return records.map(mapAuditRecord);
  }
}

@Injectable()
export class AuditRepositoryProvider {
  constructor(
    @Inject(InMemoryAuditRepository) private readonly memory: InMemoryAuditRepository,
    @Inject(PrismaAuditRepository) private readonly persistent: PrismaAuditRepository
  ) {}

  repository() {
    return persistenceEnabled() ? this.persistent : this.memory;
  }
}
