export type ToolRiskLevel = "READ_ONLY" | "LOW_RISK_WRITE" | "APPROVAL_REQUIRED" | "BLOCKED";

export type ToolDefinition = {
  name: string;
  riskLevel: ToolRiskLevel;
  requiredPermissions: string[];
};

export const initialToolRegistry: ToolDefinition[] = [];

