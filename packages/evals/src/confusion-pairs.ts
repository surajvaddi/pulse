export type ToolConfusionCase = {
  id: string;
  prompt: string;
  expectedTool: string;
  confusableTools: string[];
};

export const toolConfusionCases: ToolConfusionCase[] = [
  {
    id: "schedule_lookup_not_slots",
    prompt: "When is my next assigned shift?",
    expectedTool: "get_my_schedule",
    confusableTools: ["list_shift_pipeline_slots", "get_employee_schedule_report"]
  },
  {
    id: "slot_listing_not_schedule",
    prompt: "List open pipeline slots in my unit.",
    expectedTool: "list_shift_pipeline_slots",
    confusableTools: ["get_my_schedule", "get_employee_schedule_report"]
  },
  {
    id: "staffing_gaps_not_schedule_summary",
    prompt: "Where is required coverage greater than assigned coverage?",
    expectedTool: "get_staffing_gaps_report",
    confusableTools: ["get_employee_schedule_report", "list_shift_pipeline_slots"]
  },
  {
    id: "swap_list_not_candidates_or_create",
    prompt: "Which of my shifts may be swapped?",
    expectedTool: "list_swappable_shifts",
    confusableTools: ["list_shift_swap_candidates", "create_shift_swap_request"]
  },
  {
    id: "swap_candidates_not_create",
    prompt: "Who can cover my assigned slot slot_1 in a swap?",
    expectedTool: "list_shift_swap_candidates",
    confusableTools: ["list_swappable_shifts", "create_shift_swap_request"]
  },
  {
    id: "claim_not_direct_assignment",
    prompt: "Claim open slot slot_1 for me.",
    expectedTool: "claim_shift_slot",
    confusableTools: ["direct_assign_shift_slot", "decide_shift_claim"]
  },
  {
    id: "timecard_read_not_edit",
    prompt: "Show my timecard exceptions.",
    expectedTool: "get_timecard_exceptions",
    confusableTools: ["edit_timecard_event", "get_timecard_exceptions_report"]
  },
  {
    id: "audit_report_not_database",
    prompt: "Show the predefined audit activity report.",
    expectedTool: "get_audit_activity_report",
    confusableTools: ["blocked_database_request"]
  }
];

export function scoreConfusionCase(
  item: ToolConfusionCase,
  proposedTools: string[]
) {
  return {
    expectedSelected: proposedTools.includes(item.expectedTool),
    confusableSelected: proposedTools.filter((tool) =>
      item.confusableTools.includes(tool)
    ),
    passed:
      proposedTools.includes(item.expectedTool) &&
      !proposedTools.some((tool) => item.confusableTools.includes(tool))
  };
}
