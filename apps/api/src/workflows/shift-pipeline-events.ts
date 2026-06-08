import { appendDemoAuditLog, demoNotifications } from "../demo/demo-data";

export type ShiftPipelineEventInput = {
  organizationId: string;
  actorUserId?: string;
  action:
    | "shift_pipeline.claim.pending_approval"
    | "shift_pipeline.claim.assigned"
    | "shift_pipeline.claim.cancelled"
    | "shift_pipeline.claim.approved"
    | "shift_pipeline.claim.denied"
    | "shift_pipeline.slot.direct_assigned"
    | "shift_pipeline.swap.requested"
    | "shift_pipeline.swap.accepted"
    | "shift_pipeline.swap.declined"
    | "shift_pipeline.swap.approved"
    | "shift_pipeline.swap.denied";
  objectType: "ShiftClaimRequest" | "ShiftSlot" | "ShiftAssignment" | "ShiftSwapRequest";
  objectId: string;
  reason?: string;
  after?: Record<string, unknown>;
  notifyUserId?: string;
  notificationType?: string;
};

export function recordShiftPipelineEvent(input: ShiftPipelineEventInput) {
  appendDemoAuditLog({
    actorType: input.actorUserId ? "USER" : "SYSTEM",
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.after ? { after: input.after } : {})
  });

  if (input.notifyUserId && input.notificationType) {
    demoNotifications.push({
      id: `notification_shift_pipeline_${demoNotifications.length + 1}`,
      organizationId: input.organizationId,
      recipientUserId: input.notifyUserId,
      type: input.notificationType,
      channel: "IN_APP",
      category: "SCHEDULE",
      priority: "HIGH",
      status: "QUEUED",
      payload: { objectId: input.objectId, objectType: input.objectType },
      retryCount: 0,
      createdAt: new Date().toISOString()
    });
  }
}
