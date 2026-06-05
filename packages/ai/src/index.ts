import { z } from "zod";

export const LlmAccountRoleSchema = z.enum([
  "ORGANIZATION_OWNER",
  "SYSTEM_ADMIN",
  "WORKFORCE_ADMIN",
  "UNIT_MANAGER",
  "CHARGE_NURSE",
  "EMPLOYEE",
  "FLOAT_POOL_COORDINATOR",
  "PAYROLL_ADMIN",
  "CREDENTIALING_ADMIN",
  "COMPLIANCE_AUDITOR",
  "EXECUTIVE_VIEWER",
  "EXTERNAL_AGENCY_ADMIN",
  "AI_AGENT_SERVICE"
]);
export type LlmAccountRole = z.infer<typeof LlmAccountRoleSchema>;

export type LlmPermission = string;

export type LlmScope =
  | { type: "SELF" }
  | { type: "UNIT"; unitIds: string[] }
  | { type: "FACILITY"; facilityIds: string[] }
  | { type: "ORG"; organizationId: string };

export type LlmToolRiskLevel =
  | "READ_ONLY"
  | "LOW_RISK_WRITE"
  | "APPROVAL_REQUIRED"
  | "BLOCKED";

export const LlmMessageRoleSchema = z.enum(["system", "user", "assistant", "tool"]);
export type LlmMessageRole = z.infer<typeof LlmMessageRoleSchema>;

export const LlmModelRouteSchema = z.enum([
  "SELF_SERVICE_CHAT",
  "MANAGER_OPERATIONS",
  "SQL_REPORT_SUMMARY",
  "WORKFLOW_PREVIEW",
  "SAFETY_REVIEW",
  "EVAL_RUN"
]);
export type LlmModelRoute = z.infer<typeof LlmModelRouteSchema>;

export const LlmProviderErrorCodeSchema = z.enum([
  "DISABLED",
  "AUTHENTICATION",
  "RATE_LIMIT",
  "TIMEOUT",
  "MALFORMED_RESPONSE",
  "REFUSAL",
  "UNKNOWN"
]);
export type LlmProviderErrorCode = z.infer<typeof LlmProviderErrorCodeSchema>;

export type LlmProviderError = {
  code: LlmProviderErrorCode;
  message: string;
  retryable: boolean;
  statusCode?: number;
};

export type LlmUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
};

export type LlmToolProposal = {
  toolName: string;
  argumentsJson: Record<string, unknown>;
  riskLevel: LlmToolRiskLevel;
  requiresApproval: boolean;
};

export type LlmMessage = {
  role: LlmMessageRole;
  content: string;
  name?: string;
};

export type LlmRoleContext = {
  actorUserId: string;
  organizationId: string;
  role: LlmAccountRole;
  permissions: LlmPermission[];
  scopes: LlmScope[];
  currentPage: string;
  mode: "DEMO" | "PRODUCTION";
};

export type LlmRouteConfig = {
  route: LlmModelRoute;
  provider: "mock" | "openai-compatible";
  model: string;
  timeoutMs: number;
  maxRetries: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
};

export type LlmRequest = {
  route: LlmModelRoute;
  messages: LlmMessage[];
  roleContext: LlmRoleContext;
  availableTools: string[];
  responseFormat?: "text" | "json";
};

export type LlmResponse = {
  provider: string;
  model: string;
  route: LlmModelRoute;
  content: string;
  toolProposals: LlmToolProposal[];
  usage: LlmUsage;
  latencyMs: number;
  finishReason: "stop" | "tool_calls" | "length" | "content_filter" | "error";
  error?: LlmProviderError;
};

export interface LlmGateway {
  complete(request: LlmRequest): Promise<LlmResponse>;
}

export function serializeRoleContext(context: LlmRoleContext) {
  return {
    actorUserId: context.actorUserId,
    organizationId: context.organizationId,
    role: context.role,
    permissions: [...context.permissions].sort(),
    scopes: context.scopes,
    currentPage: context.currentPage,
    mode: context.mode
  };
}

export function normalizeProviderError(error: unknown): LlmProviderError {
  if (error && typeof error === "object" && "code" in error) {
    const candidate = error as { code?: string; message?: string; statusCode?: number };
    const parsed = LlmProviderErrorCodeSchema.safeParse(candidate.code);
    return {
      code: parsed.success ? parsed.data : "UNKNOWN",
      message: candidate.message ?? "LLM provider failed",
      retryable: parsed.success ? ["RATE_LIMIT", "TIMEOUT", "UNKNOWN"].includes(parsed.data) : true,
      ...(candidate.statusCode ? { statusCode: candidate.statusCode } : {})
    };
  }

  return {
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : "LLM provider failed",
    retryable: true
  };
}

export class MockLlmGateway implements LlmGateway {
  constructor(private readonly response?: Partial<LlmResponse>) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const startedAt = Date.now();
    return {
      provider: "mock",
      model: "mock-deterministic",
      route: request.route,
      content: "Mock LLM response",
      toolProposals: [],
      usage: {
        inputTokens: request.messages.reduce((total, message) => total + message.content.length, 0),
        outputTokens: 0,
        totalTokens: request.messages.reduce((total, message) => total + message.content.length, 0)
      },
      latencyMs: Date.now() - startedAt,
      finishReason: "stop",
      ...this.response
    };
  }
}

export function assertRoleContextComplete(contexts: LlmRoleContext[], expectedRoles: LlmAccountRole[]) {
  const coveredRoles = new Set(contexts.map((context) => context.role));
  for (const role of expectedRoles) {
    if (!coveredRoles.has(role)) {
      throw new Error(`Missing LLM role context coverage for ${role}`);
    }
  }
  return true;
}
