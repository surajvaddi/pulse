import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  LlmModelRouter,
  LlmGatewayFactory,
  parseLlmRouteOverrides,
  toProviderToolDefinition,
  type LlmGateway,
  type LlmModelRoute,
  type LlmResponse,
  type LlmRoleContext
} from "@pulseshift/ai";

import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { MonitoringService } from "../security/monitoring.service";
import { demoAIToolCalls, demoSchedules, demoTimecardExceptions } from "./demo-data";
import {
  llmRuntimeToolRegistry,
  llmRuntimeTools
} from "../workflows/llm-tool-runtime";

type ToolRiskLevel = "READ_ONLY" | "LOW_RISK_WRITE" | "APPROVAL_REQUIRED" | "BLOCKED";
type ToolStatus = "EXECUTED" | "BLOCKED" | "FAILED";
type ToolSafetyStatus = "SAFE" | "APPROVAL_REQUIRED" | "BLOCKED" | "FAILED";

type CopilotLlmContext = Pick<LlmResponse, "provider" | "model" | "route" | "latencyMs" | "usage"> & {
  availableTools: string[];
  fallback: boolean;
  pageContext: string;
  actorRole: string;
  scopeSummary: string;
};

@Injectable()
export class CopilotService {
  private readonly router = new LlmModelRouter(parseLlmRouteOverrides(process.env));
  private readonly gateway: LlmGateway = LlmGatewayFactory.fromEnvironment(process.env);

  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(MonitoringService) private readonly monitoring: MonitoringService
  ) {}

  async handleMessage(session: DemoSession, message: string) {
    const normalized = message.toLowerCase();
    const llmContext = await this.prepareLlmContext(session, message, normalized);

    if (normalized.includes("clock-in") && normalized.includes("change")) {
      return {
        ...this.blockedTool(session, "edit_timecard_event", message, llmContext),
        llm: llmContext
      };
    }

    if (normalized.includes("direct sql") || normalized.includes("raw sql") || normalized.includes("database")) {
      return {
        ...this.blockedTool(session, "blocked_database_request", message, llmContext),
        llm: llmContext
      };
    }

    if (normalized.includes("swap")) {
      this.authorizeTool(session, "create_shift_swap_request");
      return {
        mode: "ACTION_PREVIEW",
        answer:
          "I can create a swap request for Priya's Friday ICU night shift with Maya. Maya must accept, then Jordan must approve before the schedule changes.",
        toolCalls: [this.logTool(session, "create_shift_swap_request", { message }, { preview: true }, llmContext)],
        llm: llmContext
      };
    }

    if (normalized.includes("short") || normalized.includes("gap")) {
      this.authorizeTool(session, "compute_staffing_gaps");
      return {
        mode: "ANSWER",
        answer: "ICU RN Night is short 1 nurse. Recommended action: ask Nina Patel or broadcast to ICU-qualified RNs.",
        toolCalls: [
          this.logTool(
            session,
            "compute_staffing_gaps",
            { unitId: "unit_icu" },
            { gapCount: 1, severity: "HIGH" },
            llmContext
          )
        ],
        llm: llmContext
      };
    }

    if (normalized.includes("facility") || normalized.includes("coverage overview")) {
      this.authorizeTool(session, "get_staffing_gaps_report");
      return {
        mode: "ANSWER",
        answer:
          "Mercy Main has a facility coverage overview with ICU night risk, ED day coverage stable, and float pool options visible for staffing review.",
        toolCalls: [
          this.logTool(
            session,
            "get_staffing_gaps_report",
            { facilityId: "fac_mercy_main" },
            { unitsReviewed: ["unit_icu", "unit_ed"], riskUnits: ["unit_icu"] },
            llmContext
          )
        ],
        llm: llmContext
      };
    }

    if (normalized.includes("flagged") || normalized.includes("timecard")) {
      this.authorizeTool(session, "get_timecard_exceptions");
      return {
        mode: "ANSWER",
        answer:
          session.role === "PAYROLL_ADMIN"
            ? "There is 1 flagged timecard exception in ICU for Priya. Payroll can review the exception but corrections stay in the approval workflow."
            : demoTimecardExceptions[0]?.explanation ?? "No open timecard exceptions are visible.",
        toolCalls: [
          this.logTool(
            session,
            "get_timecard_exceptions",
            session.role === "PAYROLL_ADMIN" ? { unitId: "unit_icu" } : { userId: session.userId },
            {
              exceptionIds: demoTimecardExceptions.map((exception) => exception.id)
            },
            llmContext
          )
        ],
        llm: llmContext
      };
    }

    if (normalized.includes("credential") || normalized.includes("certification")) {
      this.authorizeTool(session, "get_credential_expiry_report");
      return {
        mode: "ANSWER",
        answer:
          "Nina Patel has a BLS credential expiring soon. Credentialing can verify renewal status before she is placed into restricted coverage.",
        toolCalls: [
          this.logTool(
            session,
            "get_credential_expiry_report",
            { organizationId: session.organizationId },
            { expiringEmployeeIds: ["emp_nina"] },
            llmContext
          )
        ],
        llm: llmContext
      };
    }

    if (normalized.includes("audit") || normalized.includes("admin summary")) {
      this.authorizeTool(session, "get_audit_activity_report");
      return {
        mode: "ANSWER",
        answer:
          "The audit summary shows recent schedule, notification, and AI tool-call events with blocked AI attempts separated for compliance review.",
        toolCalls: [
          this.logTool(
            session,
            "get_audit_activity_report",
            { organizationId: session.organizationId },
            { eventCategories: ["SCHEDULE", "AI_SAFETY", "INTEGRATION"] },
            llmContext
          )
        ],
        llm: llmContext
      };
    }

    this.authorizeTool(session, "get_my_schedule");
    const visibleShift = demoSchedules.find((shift) => shift.userId === session.userId);
    return {
      mode: "ANSWER",
      answer: visibleShift
        ? `Your next visible shift is ${visibleShift.title} starting ${visibleShift.startsAt}.`
        : "I do not see an upcoming shift in your self-scoped schedule.",
      toolCalls: [
        this.logTool(
          session,
          "get_my_schedule",
          { userId: session.userId },
          {
            shiftIds: visibleShift ? [visibleShift.id] : []
          },
          llmContext
        )
      ],
      llm: llmContext
    };
  }

  listToolCalls(session: DemoSession) {
    const orgScope = { type: "ORG", organizationId: session.organizationId } as const;
    if (
      this.permissions.hasPermission(session, "ai:admin", orgScope) ||
      this.permissions.hasPermission(session, "audit:read", orgScope)
    ) {
      return demoAIToolCalls;
    }

    return demoAIToolCalls.filter((toolCall) => toolCall.userId === session.userId);
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

  private blockedTool(session: DemoSession, toolName: string, message: string, llmContext: CopilotLlmContext) {
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
    const toolCall = this.logTool(
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

  private logTool(
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
    const toolCall = {
      id: `tool_${demoAIToolCalls.length + 1}`,
      userId: session.userId,
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
      actorRole: llmContext.actorRole,
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
      ...(deniedReason ? { deniedReason } : {}),
      createdAt: new Date().toISOString()
    };
    demoAIToolCalls.push(toolCall);
    return toolCall;
  }

  private findTool(toolName: string) {
    const tool = llmRuntimeToolRegistry.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    return tool;
  }

  private async prepareLlmContext(session: DemoSession, message: string, normalized: string) {
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
      provider: response.provider,
      model: response.model,
      route: response.route,
      latencyMs: response.latencyMs,
      usage: response.usage,
      availableTools: availableToolDefinitions.map((tool) => tool.name),
      pageContext,
      actorRole: session.role,
      scopeSummary: this.scopeSummary(session),
      fallback: true
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
