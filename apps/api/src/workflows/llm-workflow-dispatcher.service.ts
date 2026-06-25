import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { prisma } from "@pulseshift/db";

import type { DemoSession } from "../auth/demo-users";
import { demoEmployeeByUserId } from "../demo/demo-data";
import { OperationsService } from "../demo/operations.service";
import { ShiftClaimService } from "./shift-claim.service";
import { ShiftCreationService } from "./shift-creation.service";
import { ShiftManagerService } from "./shift-manager.service";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";
import { ShiftSwapEligibilityService } from "./shift-swap-eligibility.service";
import { ShiftSwapService } from "./shift-swap.service";
import { llmWorkflowToolRegistry, llmWorkflowTools } from "./llm-workflow-tool.registry";

export const llmWorkflowExecutorNames = llmWorkflowTools.map((tool) => tool.name);

@Injectable()
export class LlmWorkflowDispatcherService {
  constructor(
    @Inject(OperationsService) private readonly operations: OperationsService,
    @Inject(ShiftPipelineRepositoryProvider)
    private readonly repositories: ShiftPipelineRepositoryProvider,
    @Inject(ShiftClaimService) private readonly claims: ShiftClaimService,
    @Inject(ShiftManagerService) private readonly managers: ShiftManagerService,
    @Inject(ShiftSwapEligibilityService)
    private readonly swapEligibility: ShiftSwapEligibilityService,
    @Inject(ShiftSwapService) private readonly swaps: ShiftSwapService,
    @Inject(ShiftCreationService)
    private readonly creation: ShiftCreationService
  ) {}

  async execute(
    session: DemoSession,
    name: string,
    rawArguments: Record<string, unknown>
  ): Promise<unknown> {
    const tool = llmWorkflowToolRegistry.get(name);
    if (!tool) throw new NotFoundException(`Unknown workflow tool: ${name}`);
    if (tool.riskLevel === "BLOCKED" || tool.roleAccess[session.role] === "BLOCKED") {
      throw new ForbiddenException("Tool is outside the actor's role or safety policy.");
    }
    const parsed = tool.inputSchema.parse(rawArguments) as Record<string, unknown>;

    switch (name) {
      case "get_my_schedule":
        return this.getMySchedule(session);
      case "compute_staffing_gaps":
        return this.operations.staffingGaps(session);
      case "get_timecard_exceptions":
        return this.operations.timecardExceptions(session);
      case "list_swappable_shifts":
        return this.swapEligibility.listSwappableShifts(session);
      case "list_shift_swap_candidates":
        return this.swapEligibility.listCandidates(
          session,
          String(parsed.originalSlotId)
        );
      case "create_shift_swap_request":
        return this.swaps.createSwapRequest(session, {
          originalSlotId: String(parsed.originalSlotId),
          proposedUserId: String(parsed.proposedUserId)
        });
      case "respond_shift_swap":
        return this.swaps.respondToSwap(session, String(parsed.swapId), {
          decision: parsed.decision as "accept" | "decline",
          ...(parsed.reason ? { reason: String(parsed.reason) } : {})
        });
      case "list_shift_pipeline_slots":
        return this.repositories.repository().listSlots({
          organizationId: session.organizationId,
          ...(parsed.unitId ? { unitId: String(parsed.unitId) } : {}),
          ...(parsed.facilityId ? { facilityId: String(parsed.facilityId) } : {}),
          ...(Array.isArray(parsed.statuses)
            ? { statuses: parsed.statuses as never[] }
            : {})
        });
      case "claim_shift_slot":
        return this.claims.claimOpenSlot(
          session,
          String(parsed.slotId)
        );
      case "decide_shift_claim":
        return this.managers.decidePendingClaim(
          session,
          String(parsed.claimId),
          parsed.decision as "approve" | "deny",
          parsed.reason ? String(parsed.reason) : undefined
        );
      case "direct_assign_shift_slot":
        return this.managers.directAssignSlot(
          session,
          String(parsed.slotId),
          String(parsed.assigneeUserId),
          parsed.overrideReason
            ? { overrideReason: String(parsed.overrideReason) }
            : {}
        );
      case "decide_shift_swap":
        return this.swaps.decideSwap(session, String(parsed.swapId), {
          decision: parsed.decision as "approve" | "deny",
          ...(parsed.reason ? { reason: String(parsed.reason) } : {})
        });
      case "create_shift_slots_from_requirement":
        return this.creation.createSlotsFromRequirement(session, {
          id: String(parsed.requirementId),
          organizationId: session.organizationId,
          facilityId: String(parsed.facilityId),
          unitId: String(parsed.unitId),
          roleId: String(parsed.roleRequiredId),
          certificationRequiredIds: parsed.certificationRequiredIds as string[],
          startAt: String(parsed.startsAt),
          endAt: String(parsed.endsAt),
          minRequired: Number(parsed.minRequired),
          source: "AI_PREVIEW",
          ...(parsed.idealRequired
            ? { idealRequired: Number(parsed.idealRequired) }
            : {})
        });
      case "publish_shift_slots":
        return this.creation.publishDraftSlots(session, {
          facilityId: String(parsed.facilityId),
          slotIds: parsed.slotIds as string[]
        });
      default:
        throw new ForbiddenException(`Workflow tool is not executable: ${name}`);
    }
  }

  private async getMySchedule(session: DemoSession) {
    const employeeId =
      process.env.WORKFLOW_PERSISTENCE === "prisma"
        ? (
            await prisma.employeeProfile.findUnique({
              where: { userId: session.userId },
              select: { id: true }
            })
          )?.id
        : demoEmployeeByUserId.get(session.userId);
    if (!employeeId) return [];
    const repository = this.repositories.repository();
    const assignments = await repository.listAssignments({
      organizationId: session.organizationId,
      employeeId,
      statuses: ["ACTIVE"]
    });
    const slots = await repository.listSlots({
      organizationId: session.organizationId
    });
    const assignedIds = new Set(assignments.map((assignment) => assignment.slotId));
    return slots.filter((slot) => assignedIds.has(slot.id));
  }
}
