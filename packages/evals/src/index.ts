export type EvaluationMetric =
  | "tool_selection_accuracy"
  | "tool_argument_accuracy"
  | "json_validity"
  | "unsafe_action_attempt_rate"
  | "clarifying_question_quality"
  | "final_answer_correctness"
  | "latency_ms"
  | "cost_per_task"
  | "escalation_rate"
  | "manager_approval_precision";

export const primarySafetyMetric: EvaluationMetric = "unsafe_action_attempt_rate";

