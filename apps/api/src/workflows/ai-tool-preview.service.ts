import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, prisma } from "@pulseshift/db";

import type { DemoSession } from "../auth/demo-users";
import { llmRuntimeToolRegistry } from "./llm-tool-runtime";
import { LlmWorkflowDispatcherService } from "./llm-workflow-dispatcher.service";

type PreviewRecord = {
  id: string;
  organizationId: string;
  actorUserId: string;
  toolName: string;
  normalizedArgs: Record<string, unknown>;
  policyResult: Record<string, unknown>;
  targetVersion: string | null;
  idempotencyKey: string;
  status: string;
  expiresAt: Date;
  confirmedAt: Date | null;
  executionOutput: unknown;
  createdAt: Date;
};

const demoPreviews: PreviewRecord[] = [];

export function assertPreviewConfirmable(
  preview: Pick<PreviewRecord, "actorUserId" | "status" | "expiresAt" | "targetVersion">,
  session: DemoSession,
  currentTargetVersion: string | null
) {
  if (preview.actorUserId !== session.userId) {
    throw new ForbiddenException("Only the preview creator can confirm this action.");
  }
  if (preview.status !== "PENDING") {
    throw new BadRequestException("Preview has already been used.");
  }
  if (preview.expiresAt <= new Date()) {
    throw new BadRequestException("Preview has expired.");
  }
  if (
    preview.targetVersion &&
    preview.targetVersion !== currentTargetVersion
  ) {
    throw new BadRequestException("Preview target changed after it was created.");
  }
}

@Injectable()
export class AIToolPreviewService {
  constructor(
    @Inject(LlmWorkflowDispatcherService)
    private readonly dispatcher: LlmWorkflowDispatcherService
  ) {}

  async create(
    session: DemoSession,
    input: {
      toolName: string;
      normalizedArgs: Record<string, unknown>;
      policyResult: Record<string, unknown>;
      idempotencyKey: string;
      expiresInMs?: number;
    }
  ) {
    const tool = llmRuntimeToolRegistry.get(input.toolName);
    if (!tool?.allowsMutation || !tool.requiresPreview) {
      throw new BadRequestException("Only registered write tools can create previews.");
    }
    const targetVersion = await this.targetVersion(
      session.organizationId,
      input.normalizedArgs
    );
    const expiresAt = new Date(Date.now() + (input.expiresInMs ?? 10 * 60_000));
    if (process.env.WORKFLOW_PERSISTENCE === "prisma") {
      return prisma.aIToolPreview.upsert({
        where: {
          organizationId_idempotencyKey: {
            organizationId: session.organizationId,
            idempotencyKey: input.idempotencyKey
          }
        },
        update: {},
        create: {
          organizationId: session.organizationId,
          actorUserId: session.userId,
          toolName: input.toolName,
          normalizedArgs: input.normalizedArgs as Prisma.InputJsonValue,
          policyResult: input.policyResult as Prisma.InputJsonValue,
          targetVersion,
          idempotencyKey: input.idempotencyKey,
          expiresAt
        }
      });
    }
    const existing = demoPreviews.find(
      (preview) =>
        preview.organizationId === session.organizationId &&
        preview.idempotencyKey === input.idempotencyKey
    );
    if (existing) return existing;
    const preview: PreviewRecord = {
      id: `preview_${demoPreviews.length + 1}`,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      toolName: input.toolName,
      normalizedArgs: input.normalizedArgs,
      policyResult: input.policyResult,
      targetVersion,
      idempotencyKey: input.idempotencyKey,
      status: "PENDING",
      expiresAt,
      confirmedAt: null,
      executionOutput: null,
      createdAt: new Date()
    };
    demoPreviews.push(preview);
    return preview;
  }

  async confirm(session: DemoSession, previewId: string) {
    const preview = await this.find(session.organizationId, previewId);
    const normalizedArgs = preview.normalizedArgs as Record<string, unknown>;
    assertPreviewConfirmable(
      {
        actorUserId: preview.actorUserId,
        status: preview.status,
        expiresAt: preview.expiresAt,
        targetVersion: preview.targetVersion
      },
      session,
      await this.targetVersion(session.organizationId, normalizedArgs)
    );
    const output = await this.dispatcher.execute(
      session,
      preview.toolName,
      normalizedArgs
    );
    if (process.env.WORKFLOW_PERSISTENCE === "prisma") {
      return prisma.aIToolPreview.update({
        where: { id: preview.id },
        data: {
          status: "EXECUTED",
          confirmedAt: new Date(),
          executionOutput: output as Prisma.InputJsonValue
        }
      });
    }
    preview.status = "EXECUTED";
    preview.confirmedAt = new Date();
    preview.executionOutput = output;
    return preview;
  }

  private async find(organizationId: string, id: string) {
    if (process.env.WORKFLOW_PERSISTENCE === "prisma") {
      const preview = await prisma.aIToolPreview.findFirst({
        where: { id, organizationId }
      });
      if (!preview) throw new NotFoundException("AI tool preview not found.");
      return preview;
    }
    const preview = demoPreviews.find(
      (candidate) =>
        candidate.id === id && candidate.organizationId === organizationId
    );
    if (!preview) throw new NotFoundException("AI tool preview not found.");
    return preview;
  }

  private async targetVersion(
    organizationId: string,
    args: Record<string, unknown>
  ) {
    if (process.env.WORKFLOW_PERSISTENCE !== "prisma") return null;
    const slotId = args.slotId ?? args.originalSlotId;
    if (typeof slotId !== "string") return null;
    const slot = await prisma.shiftSlot.findFirst({
      where: { id: slotId, organizationId },
      select: { updatedAt: true }
    });
    return slot?.updatedAt.toISOString() ?? null;
  }
}
