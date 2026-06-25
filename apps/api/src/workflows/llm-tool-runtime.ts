import { LlmToolRegistry, type LlmToolDefinition } from "@pulseshift/ai";

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
