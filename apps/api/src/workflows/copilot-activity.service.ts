import { Injectable } from "@nestjs/common";
import { Prisma, prisma } from "@pulseshift/db";

import type { DemoSession } from "../auth/demo-users";
import { demoAIToolCalls } from "../demo/demo-data";

export type CopilotToolCallInput = {
  conversationId: string;
  toolName: string;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  status: "PROPOSED" | "AUTHORIZED" | "EXECUTED" | "BLOCKED" | "FAILED";
  riskLevel: "READ_ONLY" | "LOW_RISK_WRITE" | "APPROVAL_REQUIRED" | "BLOCKED";
  provider?: string;
  model?: string;
  route?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  pageContext?: string;
  scopeSummary?: string;
  safetyStatus?: "SAFE" | "APPROVAL_REQUIRED" | "BLOCKED" | "FAILED";
  deniedReason?: string;
};

@Injectable()
export class CopilotActivityService {
  async startConversation(session: DemoSession, prompt: string) {
    if (process.env.WORKFLOW_PERSISTENCE !== "prisma") {
      return { id: `conversation_${Date.now()}` };
    }
    return prisma.aIConversation.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        contextType:
          session.role === "EMPLOYEE" ? "SELF_SERVICE" : "MANAGER_OPS",
        messages: { create: { role: "user", content: prompt } }
      }
    });
  }

  async appendAssistantMessage(conversationId: string, content: string) {
    if (process.env.WORKFLOW_PERSISTENCE !== "prisma") return;
    await prisma.aIMessage.create({
      data: { conversationId, role: "assistant", content }
    });
  }

  async recordToolCall(session: DemoSession, input: CopilotToolCallInput) {
    if (process.env.WORKFLOW_PERSISTENCE !== "prisma") {
      const status =
        input.status === "PROPOSED" || input.status === "AUTHORIZED"
          ? ("EXECUTED" as const)
          : input.status;
      const record = {
        id: `tool_${demoAIToolCalls.length + 1}`,
        userId: session.userId,
        toolName: input.toolName,
        inputJson: input.inputJson,
        outputJson: input.outputJson,
        status,
        riskLevel: input.riskLevel,
        provider: input.provider ?? "mock",
        model: input.model ?? "mock-deterministic",
        route: input.route ?? "SELF_SERVICE_CHAT",
        latencyMs: input.latencyMs ?? 0,
        pageContext: input.pageContext ?? "/app/copilot",
        actorRole: session.role,
        scopeSummary: input.scopeSummary ?? "",
        safetyStatus: input.safetyStatus ?? "SAFE",
        ...(input.inputTokens !== undefined ? { inputTokens: input.inputTokens } : {}),
        ...(input.outputTokens !== undefined ? { outputTokens: input.outputTokens } : {}),
        ...(input.totalTokens !== undefined ? { totalTokens: input.totalTokens } : {}),
        ...(input.estimatedCostUsd !== undefined
          ? { estimatedCostUsd: input.estimatedCostUsd }
          : {}),
        ...(input.deniedReason ? { deniedReason: input.deniedReason } : {}),
        createdAt: new Date().toISOString()
      };
      demoAIToolCalls.push(record);
      return record;
    }
    return prisma.aIToolCall.create({
      data: {
        conversationId: input.conversationId,
        userId: session.userId,
        toolName: input.toolName,
        inputJson: input.inputJson as Prisma.InputJsonValue,
        outputJson: input.outputJson as Prisma.InputJsonValue,
        status: input.status,
        riskLevel: input.riskLevel,
        ...(input.provider ? { provider: input.provider } : {}),
        ...(input.model ? { model: input.model } : {}),
        ...(input.route ? { route: input.route } : {}),
        ...(input.latencyMs !== undefined ? { latencyMs: input.latencyMs } : {}),
        ...(input.inputTokens !== undefined ? { inputTokens: input.inputTokens } : {}),
        ...(input.outputTokens !== undefined ? { outputTokens: input.outputTokens } : {}),
        ...(input.totalTokens !== undefined ? { totalTokens: input.totalTokens } : {}),
        ...(input.estimatedCostUsd !== undefined
          ? { estimatedCostUsd: input.estimatedCostUsd }
          : {}),
        ...(input.pageContext ? { pageContext: input.pageContext } : {}),
        actorRole: session.role,
        ...(input.scopeSummary ? { scopeSummary: input.scopeSummary } : {}),
        ...(input.safetyStatus ? { safetyStatus: input.safetyStatus } : {}),
        ...(input.deniedReason ? { deniedReason: input.deniedReason } : {})
      }
    });
  }

  async listToolCalls(session: DemoSession, organizationWide: boolean) {
    if (process.env.WORKFLOW_PERSISTENCE !== "prisma") {
      return organizationWide
        ? demoAIToolCalls
        : demoAIToolCalls.filter((record) => record.userId === session.userId);
    }
    return prisma.aIToolCall.findMany({
      where: {
        conversation: { organizationId: session.organizationId },
        ...(!organizationWide ? { userId: session.userId } : {})
      },
      orderBy: { createdAt: "desc" }
    });
  }
}
