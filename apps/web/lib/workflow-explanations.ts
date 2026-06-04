import type { AccountRole } from "@pulseshift/domain";

import { pageContracts, type AppRoute } from "@/lib/page-contracts";

const roleLabels: Partial<Record<AccountRole, string>> = {
  EMPLOYEE: "Employee self-service",
  UNIT_MANAGER: "Unit manager operations",
  PAYROLL_ADMIN: "Payroll review",
  SYSTEM_ADMIN: "System administration",
  ORGANIZATION_OWNER: "Organization administration",
  WORKFORCE_ADMIN: "Workforce administration"
};

export type WorkflowExplanation = {
  title: string;
  summary: string;
  scope: string;
};

export function workflowExplanationForRoute(route: AppRoute, role: AccountRole | string): WorkflowExplanation {
  const contract = pageContracts[route];
  const roleLabel = roleLabels[role as AccountRole] ?? String(role).replaceAll("_", " ");
  return {
    title: roleLabel,
    summary: contract.visibleActions
      .map((action) => action.replaceAll("_", " "))
      .slice(0, 3)
      .join(", "),
    scope: `${contract.requiredScope.toLowerCase()} scope · ${contract.llmContext.toLowerCase().replaceAll("_", " ")}`
  };
}
