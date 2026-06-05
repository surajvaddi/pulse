import { Injectable } from "@nestjs/common";
import type { Request } from "express";

import type { DemoSession } from "../auth/demo-users";

export type RateLimitCategory =
  | "auth_session"
  | "invitation"
  | "copilot"
  | "workflow_write"
  | "integration"
  | "default_read";

export type RateLimitDecision = {
  allowed: boolean;
  category: RateLimitCategory;
  key: string;
  limit: number;
  remaining: number;
  resetAt: number;
};

type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitEnvironment = Partial<Record<string, string>>;

const defaultPolicies: Record<RateLimitCategory, RateLimitPolicy> = {
  auth_session: { limit: 120, windowMs: 60_000 },
  invitation: { limit: 60, windowMs: 60_000 },
  copilot: { limit: 60, windowMs: 60_000 },
  workflow_write: { limit: 100, windowMs: 60_000 },
  integration: { limit: 60, windowMs: 60_000 },
  default_read: { limit: 600, windowMs: 60_000 }
};

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();

  check(request: Request & { session?: DemoSession }, now = Date.now(), env: RateLimitEnvironment = process.env): RateLimitDecision {
    const category = classifyRateLimitCategory(request.method, request.originalUrl ?? request.path);
    const policy = policyFor(category, env);
    const key = rateLimitKey(request, category);
    const bucket = this.currentBucket(key, policy, now);
    bucket.count += 1;

    return {
      allowed: bucket.count <= policy.limit,
      category,
      key,
      limit: policy.limit,
      remaining: Math.max(policy.limit - bucket.count, 0),
      resetAt: bucket.resetAt
    };
  }

  reset() {
    this.buckets.clear();
  }

  private currentBucket(key: string, policy: RateLimitPolicy, now: number): RateLimitBucket {
    const existing = this.buckets.get(key);
    if (existing && existing.resetAt > now) {
      return existing;
    }

    const bucket = {
      count: 0,
      resetAt: now + policy.windowMs
    };
    this.buckets.set(key, bucket);
    return bucket;
  }
}

export function classifyRateLimitCategory(method: string, path: string): RateLimitCategory {
  if (path.startsWith("/health")) {
    return "default_read";
  }
  if (path.startsWith("/auth")) {
    return "auth_session";
  }
  if (path.startsWith("/invitations") || path.includes("/invite")) {
    return "invitation";
  }
  if (path.startsWith("/copilot")) {
    return "copilot";
  }
  if (path.startsWith("/integrations")) {
    return "integration";
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) {
    return "workflow_write";
  }
  return "default_read";
}

export function policyFor(category: RateLimitCategory, env: RateLimitEnvironment = process.env): RateLimitPolicy {
  const defaultPolicy = defaultPolicies[category];
  return {
    limit: parsePositiveInt(env[`RATE_LIMIT_${category.toUpperCase()}_LIMIT`], defaultPolicy.limit),
    windowMs: parsePositiveInt(env[`RATE_LIMIT_${category.toUpperCase()}_WINDOW_MS`], defaultPolicy.windowMs)
  };
}

export function rateLimitKey(request: Request & { session?: DemoSession }, category: RateLimitCategory): string {
  const session = request.session;
  const organizationId = session?.organizationId ?? "anonymous-org";
  const userId = session?.userId ?? "anonymous-user";
  const role = session?.role ?? "anonymous-role";
  const ip = request.ip || request.socket.remoteAddress || "unknown-ip";
  return [category, organizationId, userId, role, ip].join(":");
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
