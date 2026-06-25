import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const convertZodSchema = zodToJsonSchema as unknown as (
  schema: unknown,
  options: Record<string, unknown>
) => Record<string, unknown>;

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

export type LlmToolRoleAccess = "ALLOWED" | "READ_ONLY" | "APPROVAL_REQUIRED" | "BLOCKED";

export type LlmToolScopeRequirement = "SELF" | "UNIT" | "FACILITY" | "ORG" | "AGENCY" | "SERVICE";

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
  argumentParseError?: boolean;
};

export type LlmToolDefinition = {
  name: string;
  description: string;
  routeAvailability: LlmModelRoute[];
  pageContexts: string[];
  inputSchema: z.ZodType<unknown>;
  outputSchema: z.ZodType<unknown>;
  riskLevel: LlmToolRiskLevel;
  scopeRequirement: LlmToolScopeRequirement;
  roleAccess: Record<LlmAccountRole, LlmToolRoleAccess>;
  auditEvent: string;
  usesSqlReport?: boolean;
  allowsMutation?: boolean;
  requiresPolicyGate?: boolean;
  requiresPreview?: boolean;
};

export class LlmToolRegistry {
  private readonly tools: LlmToolDefinition[];

  constructor(tools: LlmToolDefinition[]) {
    this.tools = tools;
  }

  list() {
    return [...this.tools];
  }

  get(name: string) {
    return this.tools.find((tool) => tool.name === name);
  }

  availableFor(context: Pick<LlmRoleContext, "role" | "currentPage">, route: LlmModelRoute) {
    return this.tools.filter((tool) => {
      const access = tool.roleAccess[context.role];
      return (
        access !== "BLOCKED" &&
        tool.routeAvailability.includes(route) &&
        (tool.pageContexts.includes("*") || tool.pageContexts.includes(context.currentPage))
      );
    });
  }

  assertSafe() {
    const seenNames = new Set<string>();
    for (const tool of this.tools) {
      if (seenNames.has(tool.name)) {
        throw new Error(`Duplicate LLM tool registered: ${tool.name}`);
      }
      seenNames.add(tool.name);
      assertToolDefinitionSafe(tool);
    }
    return true;
  }
}

export function roleAccessFor(input: Partial<Record<LlmAccountRole, LlmToolRoleAccess>>) {
  return LlmAccountRoleSchema.options.reduce(
    (matrix, role) => ({
      ...matrix,
      [role]: input[role] ?? "BLOCKED"
    }),
    {} as Record<LlmAccountRole, LlmToolRoleAccess>
  );
}

export function assertToolDefinitionSafe(tool: LlmToolDefinition) {
  if (!tool.name || tool.name.toLowerCase().includes("raw_sql") || tool.name.toLowerCase().includes("query")) {
    throw new Error(`Unsafe or missing LLM tool name: ${tool.name}`);
  }
  for (const role of LlmAccountRoleSchema.options) {
    if (!tool.roleAccess[role]) {
      throw new Error(`Missing role access for ${tool.name}.${role}`);
    }
  }
  if (tool.usesSqlReport && tool.allowsMutation) {
    throw new Error(`SQL-backed LLM tool cannot mutate state: ${tool.name}`);
  }
  if (tool.allowsMutation && (!tool.requiresPolicyGate || !tool.requiresPreview)) {
    throw new Error(`Mutation LLM tool must require policy and preview gates: ${tool.name}`);
  }
  if (!tool.inputSchema || !tool.outputSchema) {
    throw new Error(`LLM tool must declare schemas: ${tool.name}`);
  }
  return true;
}

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
  budget: {
    maxLatencyMs: number;
    maxEstimatedCostUsd: number;
  };
  enabled: boolean;
};

export type LlmRequest = {
  route: LlmModelRoute;
  messages: LlmMessage[];
  roleContext: LlmRoleContext;
  availableTools: LlmProviderToolDefinition[];
  responseFormat?: "text" | "json";
};

export type LlmProviderToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export function toProviderToolDefinition(
  tool: Pick<LlmToolDefinition, "name" | "description" | "inputSchema">
): LlmProviderToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    parameters: convertZodSchema(tool.inputSchema, {
      $refStrategy: "none",
      target: "openApi3"
    })
  };
}

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

export type LlmRouteConfigInput = Partial<Omit<LlmRouteConfig, "route" | "budget">> & {
  budget?: Partial<LlmRouteConfig["budget"]>;
};

const defaultRouteConfigs: Record<LlmModelRoute, LlmRouteConfig> = {
  SELF_SERVICE_CHAT: {
    route: "SELF_SERVICE_CHAT",
    provider: "mock",
    model: "mock-fast",
    timeoutMs: 3000,
    maxRetries: 0,
    maxInputTokens: 4000,
    maxOutputTokens: 700,
    budget: { maxLatencyMs: 3000, maxEstimatedCostUsd: 0.01 },
    enabled: true
  },
  MANAGER_OPERATIONS: {
    route: "MANAGER_OPERATIONS",
    provider: "mock",
    model: "mock-reasoning",
    timeoutMs: 5000,
    maxRetries: 0,
    maxInputTokens: 6000,
    maxOutputTokens: 1200,
    budget: { maxLatencyMs: 5000, maxEstimatedCostUsd: 0.03 },
    enabled: true
  },
  SQL_REPORT_SUMMARY: {
    route: "SQL_REPORT_SUMMARY",
    provider: "mock",
    model: "mock-fast",
    timeoutMs: 3000,
    maxRetries: 0,
    maxInputTokens: 8000,
    maxOutputTokens: 900,
    budget: { maxLatencyMs: 3000, maxEstimatedCostUsd: 0.02 },
    enabled: true
  },
  WORKFLOW_PREVIEW: {
    route: "WORKFLOW_PREVIEW",
    provider: "mock",
    model: "mock-reasoning",
    timeoutMs: 5000,
    maxRetries: 0,
    maxInputTokens: 5000,
    maxOutputTokens: 900,
    budget: { maxLatencyMs: 5000, maxEstimatedCostUsd: 0.03 },
    enabled: true
  },
  SAFETY_REVIEW: {
    route: "SAFETY_REVIEW",
    provider: "mock",
    model: "mock-safety",
    timeoutMs: 2500,
    maxRetries: 0,
    maxInputTokens: 3000,
    maxOutputTokens: 500,
    budget: { maxLatencyMs: 2500, maxEstimatedCostUsd: 0.01 },
    enabled: true
  },
  EVAL_RUN: {
    route: "EVAL_RUN",
    provider: "mock",
    model: "mock-eval",
    timeoutMs: 8000,
    maxRetries: 0,
    maxInputTokens: 8000,
    maxOutputTokens: 1500,
    budget: { maxLatencyMs: 8000, maxEstimatedCostUsd: 0.05 },
    enabled: true
  }
};

export class LlmModelRouter {
  private readonly configs: Record<LlmModelRoute, LlmRouteConfig>;

  constructor(overrides: Partial<Record<LlmModelRoute, LlmRouteConfigInput>> = {}) {
    this.configs = LlmModelRouteSchema.options.reduce(
      (configs, route) => {
        const defaults = defaultRouteConfigs[route];
        const override = overrides[route] ?? {};
        return {
          ...configs,
          [route]: {
            ...defaults,
            ...override,
            route,
            budget: {
              ...defaults.budget,
              ...(override.budget ?? {})
            }
          }
        };
      },
      {} as Record<LlmModelRoute, LlmRouteConfig>
    );
  }

  route(route: LlmModelRoute) {
    const config = this.configs[route];
    return config.enabled ? config : this.configs.SAFETY_REVIEW;
  }

  allRoutes() {
    return LlmModelRouteSchema.options.map((route) => this.route(route));
  }
}

export function parseLlmRouteOverrides(env: Record<string, string | undefined>) {
  const provider = env.LLM_PROVIDER === "openai-compatible" ? "openai-compatible" : "mock";
  const enabled = env.LLM_PROVIDER_ENABLED === "true";
  const model = env.LLM_MODEL ?? (provider === "mock" ? "mock-fast" : "gpt-4.1-mini");

  return LlmModelRouteSchema.options.reduce(
    (overrides, route) => ({
      ...overrides,
      [route]: {
        provider,
        model: env[`LLM_MODEL_${route}`] ?? model,
        enabled: provider === "mock" ? true : enabled,
        timeoutMs: Number(env[`LLM_TIMEOUT_MS_${route}`] ?? env.LLM_TIMEOUT_MS ?? defaultRouteConfigs[route].timeoutMs)
      }
    }),
    {} as Partial<Record<LlmModelRoute, LlmRouteConfigInput>>
  );
}

export type OpenAICompatibleProviderConfig = {
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  enabled: boolean;
};

type OpenAICompatibleResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

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
  private readonly response: Partial<LlmResponse> | undefined;

  constructor(response?: Partial<LlmResponse>) {
    this.response = response;
  }

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

export class OpenAICompatibleGateway implements LlmGateway {
  private readonly config: OpenAICompatibleProviderConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(config: OpenAICompatibleProviderConfig, fetchImpl: typeof fetch = fetch) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const startedAt = Date.now();
    if (!this.config.enabled || !this.config.apiKey) {
      return this.failureResponse(request, startedAt, {
        code: "DISABLED",
        message: "OpenAI-compatible provider is disabled or missing a server-side API key",
        retryable: false
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: request.messages.map((message) => ({
            role: message.role,
            content: message.content,
            ...(message.name ? { name: message.name } : {})
          })),
          tools: request.availableTools.length
            ? request.availableTools.map((tool) => ({
                type: "function",
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters
                }
              }))
            : undefined,
          tool_choice: request.availableTools.length ? "auto" : undefined,
          response_format: request.responseFormat === "json" ? { type: "json_object" } : undefined
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        return this.failureResponse(request, startedAt, {
          code: response.status === 401 || response.status === 403 ? "AUTHENTICATION" : response.status === 429 ? "RATE_LIMIT" : "UNKNOWN",
          message: `OpenAI-compatible provider returned HTTP ${response.status}`,
          retryable: response.status === 429 || response.status >= 500,
          statusCode: response.status
        });
      }

      const payload = (await response.json()) as OpenAICompatibleResponse;
      const choice = payload.choices?.[0];
      if (!choice?.message) {
        return this.failureResponse(request, startedAt, {
          code: "MALFORMED_RESPONSE",
          message: "OpenAI-compatible provider response did not include a message",
          retryable: false
        });
      }

      return {
        provider: "openai-compatible",
        model: payload.model ?? this.config.model,
        route: request.route,
        content: choice.message.content ?? "",
        toolProposals: (choice.message.tool_calls ?? []).map((toolCall) => {
          const parsedArguments = parseToolArguments(toolCall.function?.arguments);
          return {
            toolName: toolCall.function?.name ?? "unknown_tool",
            argumentsJson: parsedArguments.argumentsJson,
            riskLevel: "READ_ONLY",
            requiresApproval: false,
            ...(parsedArguments.argumentParseError
              ? { argumentParseError: true }
              : {})
          };
        }),
        usage: {
          inputTokens: payload.usage?.prompt_tokens ?? 0,
          outputTokens: payload.usage?.completion_tokens ?? 0,
          totalTokens: payload.usage?.total_tokens ?? 0
        },
        latencyMs: Date.now() - startedAt,
        finishReason: normalizeFinishReason(choice.finish_reason)
      };
    } catch (error) {
      return this.failureResponse(request, startedAt, normalizeFetchError(error));
    } finally {
      clearTimeout(timeout);
    }
  }

  redactedConfig() {
    return {
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      timeoutMs: this.config.timeoutMs,
      maxRetries: this.config.maxRetries,
      enabled: this.config.enabled,
      apiKey: this.config.apiKey ? "[REDACTED]" : undefined
    };
  }

  private failureResponse(request: LlmRequest, startedAt: number, error: LlmProviderError): LlmResponse {
    return {
      provider: "openai-compatible",
      model: this.config.model,
      route: request.route,
      content: "",
      toolProposals: [],
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      latencyMs: Date.now() - startedAt,
      finishReason: "error",
      error
    };
  }
}

export class LlmGatewayFactory {
  static fromEnvironment(
    env: Record<string, string | undefined>,
    fetchImpl: typeof fetch = fetch
  ): LlmGateway {
    if (!env.LLM_PROVIDER || env.LLM_PROVIDER === "mock") {
      return new MockLlmGateway();
    }
    if (env.LLM_PROVIDER !== "openai-compatible") {
      throw new Error(`Unsupported LLM provider: ${env.LLM_PROVIDER}`);
    }
    return new OpenAICompatibleGateway(
      {
        baseUrl: env.LLM_BASE_URL ?? "https://api.openai.com/v1",
        ...(env.LLM_API_KEY ? { apiKey: env.LLM_API_KEY } : {}),
        model: env.LLM_MODEL ?? "gpt-4.1-mini",
        timeoutMs: Number(env.LLM_TIMEOUT_MS ?? 10_000),
        maxRetries: Number(env.LLM_MAX_RETRIES ?? 1),
        enabled: env.LLM_PROVIDER_ENABLED === "true"
      },
      fetchImpl
    );
  }
}

function parseToolArguments(value: string | undefined): {
  argumentsJson: Record<string, unknown>;
  argumentParseError: boolean;
} {
  if (!value) {
    return { argumentsJson: {}, argumentParseError: false };
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return {
      argumentsJson:
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {},
      argumentParseError:
        !parsed || typeof parsed !== "object" || Array.isArray(parsed)
    };
  } catch {
    return { argumentsJson: {}, argumentParseError: true };
  }
}

function normalizeFinishReason(reason: string | null | undefined): LlmResponse["finishReason"] {
  if (reason === "tool_calls") {
    return "tool_calls";
  }
  if (reason === "length") {
    return "length";
  }
  if (reason === "content_filter") {
    return "content_filter";
  }
  return "stop";
}

function normalizeFetchError(error: unknown): LlmProviderError {
  if (error instanceof Error && error.name === "AbortError") {
    return {
      code: "TIMEOUT",
      message: "OpenAI-compatible provider request timed out",
      retryable: true
    };
  }
  return normalizeProviderError(error);
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
