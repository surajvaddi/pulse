import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  LlmModelRouter,
  LlmGatewayFactory,
  parseLlmRouteOverrides,
  toProviderToolDefinition,
  type LlmGateway,
  type LlmModelRoute,
  type LlmResponse,
  type LlmRoleContext,
  type LlmToolProposal
} from "@pulseshift/ai";

import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { MonitoringService } from "../security/monitoring.service";
import {
  llmRuntimeToolRegistry,
  llmRuntimeTools,
  normalizeToolProposal
} from "../workflows/llm-tool-runtime";
import { CopilotActivityService } from "../workflows/copilot-activity.service";
import { LlmWorkflowDispatcherService } from "../workflows/llm-workflow-dispatcher.service";
import { SqlReportExecutorService } from "../workflows/sql-report-executor.service";
import { AIToolPreviewService } from "../workflows/ai-tool-preview.service";
import type { SqlReportName } from "../workflows/repository-contracts";

type ToolRiskLevel = "READ_ONLY" | "LOW_RISK_WRITE" | "APPROVAL_REQUIRED" | "BLOCKED";
type ToolStatus = "EXECUTED" | "BLOCKED" | "FAILED";
type ToolSafetyStatus = "SAFE" | "APPROVAL_REQUIRED" | "BLOCKED" | "FAILED";

type CopilotLlmContext = Pick<LlmResponse, "provider" | "model" | "route" | "latencyMs" | "usage"> & {
  conversationId: string;
  availableTools: string[];
  fallback: boolean;
  pageContext: string;
  actorRole: string;
  scopeSummary: string;
  providerContent: string;
  toolProposals: LlmToolProposal[];
};

export function answerFromToolResult(toolName: string, output: unknown) {
  if (Array.isArray(output)) {
    if (output.length === 0) {
      return `No records were found for ${toolName.replaceAll("_", " ")} in your current scope.`;
    }
    return `I found ${output.length} record${output.length === 1 ? "" : "s"} for ${toolName.replaceAll("_", " ")}: ${JSON.stringify(output.slice(0, 3))}`;
  }
  if (output && typeof output === "object") {
    return `The ${toolName.replaceAll("_", " ")} result is ${JSON.stringify(output)}.`;
  }
  return `The ${toolName.replaceAll("_", " ")} request completed with no additional data.`;
}

@Injectable()
export class CopilotService {
  private readonly router = new LlmModelRouter(parseLlmRouteOverrides(process.env));
  private readonly gateway: LlmGateway = LlmGatewayFactory.fromEnvironment(process.env);

  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(MonitoringService) private readonly monitoring: MonitoringService,
    @Inject(CopilotActivityService)
    private readonly activity: CopilotActivityService,
    @Inject(LlmWorkflowDispatcherService)
    private readonly workflowDispatcher: LlmWorkflowDispatcherService,
    @Inject(SqlReportExecutorService)
    private readonly sqlReports: SqlReportExecutorService,
    @Inject(AIToolPreviewService)
    private readonly previews: AIToolPreviewService
  ) {}

  async handleMessage(session: DemoSession, message: string) {
    const response = await this.buildResponse(session, message);
    await this.activity.appendAssistantMessage(
      response.llm.conversationId,
      response.answer
    );
    return response;
  }

  private async buildResponse(session: DemoSession, message: string) {
    const normalized = message.toLowerCase();
    const llmContext = await this.prepareLlmContext(session, message, normalized);
    const proposed =
      llmContext.toolProposals[0] ??
      this.deterministicMockProposal(session, normalized);
    if (!proposed) {
      return {
        mode: "ANSWER",
        answer:
          llmContext.providerContent ||
          "I could not identify a permitted workforce action for that request.",
        toolCalls: [],
        llm: llmContext
      };
    }
    if (["edit_timecard_event", "blocked_database_request"].includes(proposed.toolName)) {
      return {
        ...(await this.blockedTool(
          session,
          proposed.toolName,
          message,
          llmContext
        )),
        llm: llmContext
      };
    }
    const normalizedProposal = normalizeToolProposal(proposed);
    this.authorizeTool(session, normalizedProposal.toolName);
    const tool = this.findTool(normalizedProposal.toolName);
    if (tool.allowsMutation) {
      const preview = await this.previews.create(session, {
        toolName: tool.name,
        normalizedArgs: normalizedProposal.argumentsJson,
        policyResult: {
          allowed: true,
          requiresApproval: normalizedProposal.requiresApproval,
          riskLevel: normalizedProposal.riskLevel
        },
        idempotencyKey: `${llmContext.conversationId}:${tool.name}`
      });
      const output = { previewId: preview.id, status: preview.status };
      return {
        mode: "ACTION_PREVIEW",
        answer: "The action is ready for your review. Confirm the preview to continue.",
        toolCalls: [
          await this.logTool(
            session,
            tool.name,
            normalizedProposal.argumentsJson,
            output,
            llmContext,
            "EXECUTED",
            tool.riskLevel
          )
        ],
        preview,
        llm: llmContext
      };
    }
    const output = tool.usesSqlReport
      ? await this.sqlReports.executeSqlReport(
          session,
          tool.name as SqlReportName,
          normalizedProposal.argumentsJson
        )
      : await this.workflowDispatcher.execute(
          session,
          tool.name,
          normalizedProposal.argumentsJson
        );
    const outputJson = { records: output };
    return {
      mode: "ANSWER",
      answer: answerFromToolResult(tool.name, output),
      toolCalls: [
        await this.logTool(
          session,
          tool.name,
          normalizedProposal.argumentsJson,
          outputJson,
          llmContext
        )
      ],
      llm: llmContext
    };
  }

  private deterministicMockProposal(
    session: DemoSession,
    normalized: string
  ): LlmToolProposal | undefined {
    if (normalized.includes("direct sql") || normalized.includes("raw sql") || normalized.includes("database")) {
      return this.mockProposal("blocked_database_request", {});
    }
    if (normalized.includes("clock-in") && normalized.includes("change")) {
      return this.mockProposal("edit_timecard_event", {});
    }
    const candidates: Array<[boolean, string, Record<string, unknown>]> = [
      [normalized.includes("swap"), "list_swappable_shifts", {}],
      [
        normalized.includes("short") ||
          normalized.includes("gap") ||
          normalized.includes("staffing") ||
          normalized.includes("coverage"),
        "compute_staffing_gaps",
        {}
      ],
      [
        normalized.includes("timecard") || normalized.includes("flagged"),
        session.role === "EMPLOYEE"
          ? "get_timecard_exceptions"
          : "get_timecard_exceptions_report",
        {}
      ],
      [
        normalized.includes("credential") || normalized.includes("certification"),
        "get_credential_expiry_report",
        {}
      ],
      [normalized.includes("audit"), "get_audit_activity_report", {}]
    ];
    const selected = candidates.find(
      ([matches, name]) =>
        matches &&
        llmRuntimeToolRegistry.get(name)?.roleAccess[session.role] !== "BLOCKED"
    );
    if (selected) return this.mockProposal(selected[1], selected[2]);
    if (
      llmRuntimeToolRegistry.get("get_my_schedule")?.roleAccess[session.role] !==
      "BLOCKED"
    ) {
      return this.mockProposal("get_my_schedule", { userId: session.userId });
    }
    return undefined;
  }

  private mockProposal(
    toolName: string,
    argumentsJson: Record<string, unknown>
  ): LlmToolProposal {
    return {
      toolName,
      argumentsJson,
      riskLevel: "READ_ONLY",
      requiresApproval: false
    };
  }

  listToolCalls(session: DemoSession) {
    const orgScope = { type: "ORG", organizationId: session.organizationId } as const;
    if (
      this.permissions.hasPermission(session, "ai:admin", orgScope) ||
      this.permissions.hasPermission(session, "audit:read", orgScope)
    ) {
      return this.activity.listToolCalls(session, true);
    }

    return this.activity.listToolCalls(session, false);
  }

  private authorizeTool(session: DemoSession, toolName: string) {
    const tool = this.findTool(toolName);
    if (tool.riskLevel === "BLOCKED") {
      throw new ForbiddenException("Tool is blocked by AI safety policy");
    }
    if (tool.roleAccess[session.role] === "BLOCKED") {
      throw new ForbiddenException("Tool is outside the requesting user's effective permissions");
    }
  }

  private async blockedTool(session: DemoSession, toolName: string, message: string, llmContext: CopilotLlmContext) {
    const tool = this.findTool(toolName);
    const deniedReason =
      toolName === "blocked_database_request"
        ? "AI cannot run direct SQL or database changes."
        : "AI cannot directly edit payroll-impacting timecard events.";
    this.monitoring.emitForSession({
      name: "ai.blocked_action",
      severity: "WARN",
      session,
      route: "/copilot/messages",
      metadata: {
        toolName,
        riskLevel: tool.riskLevel,
        reason: deniedReason,
        prompt: message
      }
    });
    const toolCall = await this.logTool(
      session,
      toolName,
      { message },
      { blockedReason: deniedReason },
      llmContext,
      "BLOCKED",
      tool.riskLevel,
      deniedReason
    );
    return {
      mode: "BLOCKED",
      answer:
        toolName === "blocked_database_request"
          ? "I cannot run direct SQL or database changes. I can use predefined reporting tools or create a reviewed workflow request instead."
          : "I cannot directly edit clock-in events. I can help create a timecard correction request for manager or payroll review.",
      toolCalls: [toolCall]
    };
  }

  private async logTool(
    session: DemoSession,
    toolName: string,
    inputJson: Record<string, unknown>,
    outputJson: Record<string, unknown>,
    llmContext: CopilotLlmContext,
    status: ToolStatus = "EXECUTED",
    riskLevel = this.findTool(toolName).riskLevel,
    deniedReason?: string
  ) {
    const safetyStatus = this.safetyStatusFor(status, riskLevel);
    return this.activity.recordToolCall(session, {
      conversationId: llmContext.conversationId,
      toolName,
      inputJson,
      outputJson,
      status,
      riskLevel,
      provider: llmContext.provider,
      model: llmContext.model,
      route: llmContext.route,
      latencyMs: llmContext.latencyMs,
      pageContext: llmContext.pageContext,
      scopeSummary: llmContext.scopeSummary,
      safetyStatus,
      ...(llmContext.usage
        ? {
            inputTokens: llmContext.usage.inputTokens,
            outputTokens: llmContext.usage.outputTokens,
            totalTokens: llmContext.usage.totalTokens
          }
        : {}),
      ...(llmContext.usage?.estimatedCostUsd !== undefined
        ? { estimatedCostUsd: llmContext.usage.estimatedCostUsd }
        : {}),
      ...(deniedReason ? { deniedReason } : {})
    });
  }

  private findTool(toolName: string) {
    const tool = llmRuntimeToolRegistry.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    return tool;
  }

  private async prepareLlmContext(session: DemoSession, message: string, normalized: string) {
    const conversation = await this.activity.startConversation(session, message);
    const route = this.routeForMessage(normalized);
    const pageContext = "/app/copilot";
    const roleContext: LlmRoleContext = {
      actorUserId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      permissions: session.grants.map((grant) => grant.permission),
      scopes: session.grants.map((grant) => grant.scope),
      currentPage: pageContext,
      mode: process.env.ENABLE_DEMO_AUTH === "false" ? "PRODUCTION" : "DEMO"
    };
    const modelRoute = this.router.route(route);
    const availableToolDefinitions = llmRuntimeTools
      .filter((tool) =>
        tool.routeAvailability.includes(route) &&
        tool.roleAccess[session.role] !== "BLOCKED" &&
        (tool.pageContexts.includes("*") || tool.pageContexts.includes(roleContext.currentPage))
      )
      .map(toProviderToolDefinition);
    const response = await this.gateway.complete({
      route: modelRoute.route,
      messages: [{ role: "user", content: message }],
      roleContext,
      availableTools: availableToolDefinitions
    });

    return {
      conversationId: conversation.id,
      provider: response.provider,
      model: response.model,
      route: response.route,
      latencyMs: response.latencyMs,
      usage: response.usage,
      availableTools: availableToolDefinitions.map((tool) => tool.name),
      pageContext,
      actorRole: session.role,
      scopeSummary: this.scopeSummary(session),
      fallback: response.provider === "mock",
      providerContent: response.content,
      toolProposals: response.toolProposals
    };
  }

  private safetyStatusFor(status: ToolStatus, riskLevel: ToolRiskLevel): ToolSafetyStatus {
    if (status === "FAILED") {
      return "FAILED";
    }
    if (status === "BLOCKED" || riskLevel === "BLOCKED") {
      return "BLOCKED";
    }
    if (riskLevel === "APPROVAL_REQUIRED") {
      return "APPROVAL_REQUIRED";
    }
    return "SAFE";
  }

  private scopeSummary(session: DemoSession) {
    return [...new Set(session.grants.map((grant) => grant.scope.type))].sort().join(",");
  }

  private routeForMessage(normalized: string): LlmModelRoute {
    if (
      normalized.includes("short") ||
      normalized.includes("gap") ||
      normalized.includes("staffing") ||
      normalized.includes("facility") ||
      normalized.includes("coverage overview")
    ) {
      return "MANAGER_OPERATIONS";
    }
    if (normalized.includes("swap") || normalized.includes("claim")) {
      return "WORKFLOW_PREVIEW";
    }
    if (
      normalized.includes("audit") ||
      normalized.includes("summary") ||
      normalized.includes("credential") ||
      normalized.includes("certification") ||
      normalized.includes("timecard")
    ) {
      return "SQL_REPORT_SUMMARY";
    }
    if (
      normalized.includes("change") ||
      normalized.includes("delete") ||
      normalized.includes("sql") ||
      normalized.includes("database")
    ) {
      return "SAFETY_REVIEW";
    }
    return "SELF_SERVICE_CHAT";
  }
}
