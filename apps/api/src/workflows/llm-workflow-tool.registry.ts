import { z } from "zod";
import {
  LlmToolRegistry,
  roleAccessFor,
  type LlmToolDefinition
} from "@pulseshift/ai";

const emptyOutput = z.record(z.unknown());

export const llmWorkflowTools: LlmToolDefinition[] = [
  {
    name: "get_my_schedule",
    description: "Read the current user's self-scoped schedule.",
    routeAvailability: ["SELF_SERVICE_CHAT", "WORKFLOW_PREVIEW"],
    pageContexts: ["*", "/app/home", "/app/schedule", "/app/copilot"],
    inputSchema: z.object({ userId: z.string().min(1) }).strict(),
    outputSchema: emptyOutput,
    riskLevel: "READ_ONLY",
    scopeRequirement: "SELF",
    roleAccess: roleAccessFor({
      EMPLOYEE: "ALLOWED",
      EXTERNAL_AGENCY_ADMIN: "READ_ONLY",
      SYSTEM_ADMIN: "READ_ONLY",
      ORGANIZATION_OWNER: "READ_ONLY",
      AI_AGENT_SERVICE: "READ_ONLY"
    }),
    auditEvent: "llm.workflow.get_my_schedule"
  },
  {
    name: "compute_staffing_gaps",
    description: "Read scoped staffing gap context.",
    routeAvailability: ["MANAGER_OPERATIONS", "SQL_REPORT_SUMMARY"],
    pageContexts: ["*", "/app/manager", "/app/staffing-gaps", "/app/copilot"],
    inputSchema: z.object({ unitId: z.string().min(1).optional() }).strict(),
    outputSchema: emptyOutput,
    riskLevel: "READ_ONLY",
    scopeRequirement: "UNIT",
    roleAccess: roleAccessFor({
      UNIT_MANAGER: "ALLOWED",
      CHARGE_NURSE: "READ_ONLY",
      WORKFORCE_ADMIN: "ALLOWED",
      FLOAT_POOL_COORDINATOR: "ALLOWED",
      EXECUTIVE_VIEWER: "READ_ONLY",
      SYSTEM_ADMIN: "READ_ONLY",
      ORGANIZATION_OWNER: "READ_ONLY"
    }),
    auditEvent: "llm.workflow.compute_staffing_gaps"
  },
  {
    name: "get_timecard_exceptions",
    description: "Read scoped timecard exception context.",
    routeAvailability: ["SELF_SERVICE_CHAT", "MANAGER_OPERATIONS"],
    pageContexts: ["*", "/app/timecards", "/app/copilot"],
    inputSchema: z.object({ userId: z.string().min(1).optional(), unitId: z.string().min(1).optional() }).strict(),
    outputSchema: emptyOutput,
    riskLevel: "READ_ONLY",
    scopeRequirement: "SELF",
    roleAccess: roleAccessFor({
      EMPLOYEE: "ALLOWED",
      PAYROLL_ADMIN: "ALLOWED",
      UNIT_MANAGER: "READ_ONLY",
      SYSTEM_ADMIN: "READ_ONLY",
      ORGANIZATION_OWNER: "READ_ONLY"
    }),
    auditEvent: "llm.workflow.get_timecard_exceptions"
  },
  {
    name: "create_shift_swap_request",
    description: "Preview and create a shift swap request that still requires counterpart/manager approval.",
    routeAvailability: ["SELF_SERVICE_CHAT", "WORKFLOW_PREVIEW"],
    pageContexts: ["*", "/app/swaps", "/app/copilot"],
    inputSchema: z.object({ originalShiftId: z.string().min(1), proposedUserId: z.string().min(1) }).strict(),
    outputSchema: emptyOutput,
    riskLevel: "LOW_RISK_WRITE",
    scopeRequirement: "SELF",
    roleAccess: roleAccessFor({ EMPLOYEE: "APPROVAL_REQUIRED" }),
    auditEvent: "llm.workflow.create_shift_swap_request",
    allowsMutation: true,
    requiresPolicyGate: true,
    requiresPreview: true
  },
  {
    name: "claim_open_shift",
    description: "Preview and claim an open shift through policy checks.",
    routeAvailability: ["SELF_SERVICE_CHAT", "WORKFLOW_PREVIEW"],
    pageContexts: ["*", "/app/open-shifts", "/app/copilot"],
    inputSchema: z.object({ shiftId: z.string().min(1) }).strict(),
    outputSchema: emptyOutput,
    riskLevel: "LOW_RISK_WRITE",
    scopeRequirement: "SELF",
    roleAccess: roleAccessFor({ EMPLOYEE: "APPROVAL_REQUIRED", EXTERNAL_AGENCY_ADMIN: "APPROVAL_REQUIRED" }),
    auditEvent: "llm.workflow.claim_open_shift",
    allowsMutation: true,
    requiresPolicyGate: true,
    requiresPreview: true
  },
  {
    name: "approve_shift_swap",
    description: "Preview and decide a manager-scoped shift swap approval.",
    routeAvailability: ["MANAGER_OPERATIONS", "WORKFLOW_PREVIEW"],
    pageContexts: ["*", "/app/manager", "/app/swaps", "/app/copilot"],
    inputSchema: z.object({ swapId: z.string().min(1), decision: z.enum(["approve", "deny"]) }).strict(),
    outputSchema: emptyOutput,
    riskLevel: "APPROVAL_REQUIRED",
    scopeRequirement: "UNIT",
    roleAccess: roleAccessFor({ UNIT_MANAGER: "APPROVAL_REQUIRED" }),
    auditEvent: "llm.workflow.approve_shift_swap",
    allowsMutation: true,
    requiresPolicyGate: true,
    requiresPreview: true
  },
  {
    name: "edit_timecard_event",
    description: "Blocked direct payroll-impacting timecard edit.",
    routeAvailability: ["SELF_SERVICE_CHAT", "MANAGER_OPERATIONS", "SAFETY_REVIEW"],
    pageContexts: ["*"],
    inputSchema: z.object({ eventId: z.string().optional(), requestedChange: z.string().optional() }).strict(),
    outputSchema: emptyOutput,
    riskLevel: "BLOCKED",
    scopeRequirement: "SERVICE",
    roleAccess: roleAccessFor({}),
    auditEvent: "llm.workflow.blocked_timecard_edit"
  },
  {
    name: "blocked_database_request",
    description: "Blocked arbitrary database execution attempt.",
    routeAvailability: ["SAFETY_REVIEW"],
    pageContexts: ["*"],
    inputSchema: z.object({ sql: z.string().optional() }).strict(),
    outputSchema: emptyOutput,
    riskLevel: "BLOCKED",
    scopeRequirement: "SERVICE",
    roleAccess: roleAccessFor({}),
    auditEvent: "llm.workflow.blocked_database_request"
  }
];

export const llmWorkflowToolRegistry = new LlmToolRegistry(llmWorkflowTools);

export function assertLlmWorkflowToolsSafe() {
  const visibleTools = llmWorkflowTools.filter((tool) => !["edit_timecard_event", "blocked_database_request"].includes(tool.name));
  for (const tool of visibleTools) {
    if (tool.allowsMutation && (!tool.requiresPolicyGate || !tool.requiresPreview)) {
      throw new Error(`Workflow mutation tool must require policy and preview: ${tool.name}`);
    }
  }
  return llmWorkflowToolRegistry.assertSafe();
}
