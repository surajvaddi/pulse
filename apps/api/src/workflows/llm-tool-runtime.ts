import {
  LlmToolRegistry,
  type LlmToolDefinition,
  type LlmToolProposal
} from "@pulseshift/ai";

import { llmSqlReportTools } from "./llm-sql-tool.registry";
import { llmWorkflowTools } from "./llm-workflow-tool.registry";

export const llmRuntimeTools: LlmToolDefinition[] = [
  ...llmWorkflowTools,
  ...llmSqlReportTools
];

export const llmRuntimeToolRegistry = new LlmToolRegistry(llmRuntimeTools);

export function assertLlmRuntimeRegistry(executorNames?: Iterable<string>) {
  llmRuntimeToolRegistry.assertSafe();
  if (!executorNames) return true;

  const registered = new Set(llmRuntimeTools.map((tool) => tool.name));
  const executors = new Set(executorNames);
  const orphaned = [...registered].filter((name) => !executors.has(name));
  const unregistered = [...executors].filter((name) => !registered.has(name));
  if (orphaned.length || unregistered.length) {
    throw new Error(
      `LLM runtime registry mismatch: orphaned=${orphaned.join(",")}; unregistered=${unregistered.join(",")}`
    );
  }
  return true;
}

export type NormalizedToolProposal = {
  toolName: string;
  argumentsJson: Record<string, unknown>;
  riskLevel: LlmToolDefinition["riskLevel"];
  requiresApproval: boolean;
};

export function normalizeToolProposal(
  proposal: LlmToolProposal
): NormalizedToolProposal {
  const tool = llmRuntimeToolRegistry.get(proposal.toolName);
  if (!tool) throw new Error(`Unknown LLM tool proposal: ${proposal.toolName}`);
  if (proposal.argumentParseError) {
    throw new Error(`Malformed JSON arguments for ${proposal.toolName}`);
  }
  const parsed = tool.inputSchema.safeParse(proposal.argumentsJson);
  if (!parsed.success) {
    throw new Error(
      `Invalid arguments for ${proposal.toolName}: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`
    );
  }
  return {
    toolName: tool.name,
    argumentsJson: parsed.data as Record<string, unknown>,
    riskLevel: tool.riskLevel,
    requiresApproval:
      tool.riskLevel === "APPROVAL_REQUIRED" ||
      tool.roleAccess.ORGANIZATION_OWNER === "APPROVAL_REQUIRED" ||
      Boolean(tool.allowsMutation)
  };
}
