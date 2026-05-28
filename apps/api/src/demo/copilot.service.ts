import { ForbiddenException, Injectable } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { demoAIToolCalls, demoSchedules, demoTimecardExceptions } from "./demo-data";

type ToolRiskLevel = "READ_ONLY" | "LOW_RISK_WRITE" | "APPROVAL_REQUIRED" | "BLOCKED";

type ToolDefinition = {
  name: string;
  riskLevel: ToolRiskLevel;
  requiredPermission: Parameters<PermissionService["hasPermission"]>[1];
};

const tools: ToolDefinition[] = [
  { name: "get_my_schedule", riskLevel: "READ_ONLY", requiredPermission: "schedule:read:self" },
  { name: "compute_staffing_gaps", riskLevel: "READ_ONLY", requiredPermission: "schedule:read:unit" },
  { name: "get_timecard_exceptions", riskLevel: "READ_ONLY", requiredPermission: "timecard:read:self" },
  { name: "create_shift_swap_request", riskLevel: "LOW_RISK_WRITE", requiredPermission: "shift:swap:create" },
  { name: "edit_timecard_event", riskLevel: "BLOCKED", requiredPermission: "timecard:resolve" }
];

@Injectable()
export class CopilotService {
  constructor(private readonly permissions: PermissionService) {}

  handleMessage(session: DemoSession, message: string) {
    const normalized = message.toLowerCase();

    if (normalized.includes("clock-in") && normalized.includes("change")) {
      return this.blockedTool(session, "edit_timecard_event", message);
    }

    if (normalized.includes("swap")) {
      this.authorizeTool(session, "create_shift_swap_request");
      return {
        mode: "ACTION_PREVIEW",
        answer:
          "I can create a swap request for Priya's Friday ICU night shift with Maya. Maya must accept, then Jordan must approve before the schedule changes.",
        toolCalls: [this.logTool(session, "create_shift_swap_request", { message }, { preview: true })]
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
            { gapCount: 1, severity: "HIGH" }
          )
        ]
      };
    }

    if (normalized.includes("flagged") || normalized.includes("timecard")) {
      this.authorizeTool(session, "get_timecard_exceptions");
      return {
        mode: "ANSWER",
        answer: demoTimecardExceptions[0]?.explanation ?? "No open timecard exceptions are visible.",
        toolCalls: [
          this.logTool(session, "get_timecard_exceptions", { userId: session.userId }, {
            exceptionIds: demoTimecardExceptions.map((exception) => exception.id)
          })
        ]
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
        this.logTool(session, "get_my_schedule", { userId: session.userId }, {
          shiftIds: visibleShift ? [visibleShift.id] : []
        })
      ]
    };
  }

  listToolCalls(session: DemoSession) {
    if (this.permissions.hasPermission(session, "ai:admin", { type: "ORG", organizationId: session.organizationId })) {
      return demoAIToolCalls;
    }

    return demoAIToolCalls.filter((toolCall) => toolCall.userId === session.userId);
  }

  private authorizeTool(session: DemoSession, toolName: string) {
    const tool = this.findTool(toolName);
    if (tool.riskLevel === "BLOCKED") {
      throw new ForbiddenException("Tool is blocked by AI safety policy");
    }
    const scope =
      tool.requiredPermission.endsWith(":self") || tool.requiredPermission.includes(":create")
        ? ({ type: "SELF", userId: session.userId } as const)
        : ({ type: "UNIT", unitId: "unit_icu" } as const);
    if (!this.permissions.hasPermission(session, tool.requiredPermission, scope)) {
      throw new ForbiddenException("Tool is outside the requesting user's effective permissions");
    }
  }

  private blockedTool(session: DemoSession, toolName: string, message: string) {
    const tool = this.findTool(toolName);
    const toolCall = this.logTool(
      session,
      toolName,
      { message },
      { blockedReason: "AI cannot directly edit payroll-impacting timecard events." },
      "BLOCKED",
      tool.riskLevel
    );
    return {
      mode: "BLOCKED",
      answer:
        "I cannot directly edit clock-in events. I can help create a timecard correction request for manager or payroll review.",
      toolCalls: [toolCall]
    };
  }

  private logTool(
    session: DemoSession,
    toolName: string,
    inputJson: Record<string, unknown>,
    outputJson: Record<string, unknown>,
    status: "EXECUTED" | "BLOCKED" = "EXECUTED",
    riskLevel = this.findTool(toolName).riskLevel
  ) {
    const toolCall = {
      id: `tool_${demoAIToolCalls.length + 1}`,
      userId: session.userId,
      toolName,
      inputJson,
      outputJson,
      status,
      riskLevel,
      createdAt: new Date().toISOString()
    };
    demoAIToolCalls.push(toolCall);
    return toolCall;
  }

  private findTool(toolName: string) {
    const tool = tools.find((candidate) => candidate.name === toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    return tool;
  }
}
