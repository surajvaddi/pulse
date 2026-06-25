import type {
  LlmGateway,
  LlmRequest,
  LlmResponse,
  LlmToolProposal
} from "./index.js";

export type ProviderFixtureKind =
  | "correct"
  | "incorrect"
  | "malformed"
  | "multiple"
  | "forbidden";

export function providerFixtureProposal(
  kind: ProviderFixtureKind
): LlmToolProposal[] {
  const valid = {
    toolName: "claim_shift_slot",
    argumentsJson: { slotId: "slot_1" },
    riskLevel: "LOW_RISK_WRITE" as const,
    requiresApproval: true
  };
  switch (kind) {
    case "correct":
      return [valid];
    case "incorrect":
      return [{ ...valid, toolName: "get_my_schedule", argumentsJson: {} }];
    case "malformed":
      return [{ ...valid, argumentsJson: {}, argumentParseError: true }];
    case "multiple":
      return [
        valid,
        { ...valid, toolName: "get_my_schedule", argumentsJson: {} }
      ];
    case "forbidden":
      return [
        {
          ...valid,
          toolName: "blocked_database_request",
          argumentsJson: { sql: "delete from shifts" },
          riskLevel: "BLOCKED"
        }
      ];
  }
}

export class FixtureLlmGateway implements LlmGateway {
  constructor(private readonly fixture: ProviderFixtureKind) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    return {
      provider: "fixture",
      model: `fixture-${this.fixture}`,
      route: request.route,
      content: "",
      toolProposals: providerFixtureProposal(this.fixture),
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      latencyMs: 1,
      finishReason: "tool_calls"
    };
  }
}
