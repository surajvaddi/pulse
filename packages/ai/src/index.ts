export type ModelRoute =
  | "SMALL_LOCAL"
  | "DISTILLED_TOOL_MODEL"
  | "LARGE_MODEL"
  | "ENSEMBLE_WITH_VALIDATOR";

export type RouteDecision = {
  route: ModelRoute;
  reason: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  requiresHumanApproval: boolean;
};

