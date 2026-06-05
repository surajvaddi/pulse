import { Inject, Injectable } from "@nestjs/common";
import type { AccountRole, NotificationCategory, NotificationPriority } from "@pulseshift/domain";

import { demoSessions } from "../auth/demo-users";
import { AuditService } from "./audit.service";
import { NotificationService } from "./notification.service";

export type WorkflowNotificationEvent =
  | "APPROVAL_REQUIRED"
  | "SHIFT_ASSIGNED"
  | "SWAP_REQUESTED"
  | "SWAP_APPROVED"
  | "SWAP_DENIED"
  | "OPEN_SHIFT_AVAILABLE"
  | "TIMECARD_EXCEPTION"
  | "STAFFING_RISK"
  | "CREDENTIAL_EXPIRING"
  | "INTEGRATION_ATTENTION"
  | "AI_SAFETY_REVIEW";

type WorkflowNotificationDefinition = {
  category: NotificationCategory;
  priority: NotificationPriority;
  eligibleRoles: AccountRole[];
};

const workflowNotificationDefinitions: Record<
  WorkflowNotificationEvent,
  WorkflowNotificationDefinition
> = {
  APPROVAL_REQUIRED: {
    category: "APPROVAL",
    priority: "URGENT",
    eligibleRoles: ["UNIT_MANAGER", "WORKFORCE_ADMIN", "SYSTEM_ADMIN", "ORGANIZATION_OWNER"]
  },
  SHIFT_ASSIGNED: {
    category: "SCHEDULE",
    priority: "HIGH",
    eligibleRoles: ["EMPLOYEE", "EXTERNAL_AGENCY_ADMIN"]
  },
  SWAP_REQUESTED: {
    category: "SWAP",
    priority: "HIGH",
    eligibleRoles: ["EMPLOYEE"]
  },
  SWAP_APPROVED: {
    category: "SWAP",
    priority: "HIGH",
    eligibleRoles: ["EMPLOYEE"]
  },
  SWAP_DENIED: {
    category: "SWAP",
    priority: "HIGH",
    eligibleRoles: ["EMPLOYEE"]
  },
  OPEN_SHIFT_AVAILABLE: {
    category: "STAFFING",
    priority: "HIGH",
    eligibleRoles: ["EMPLOYEE", "FLOAT_POOL_COORDINATOR", "EXTERNAL_AGENCY_ADMIN"]
  },
  TIMECARD_EXCEPTION: {
    category: "TIMECARD",
    priority: "HIGH",
    eligibleRoles: ["EMPLOYEE", "PAYROLL_ADMIN", "UNIT_MANAGER"]
  },
  STAFFING_RISK: {
    category: "STAFFING",
    priority: "HIGH",
    eligibleRoles: ["UNIT_MANAGER", "CHARGE_NURSE", "WORKFORCE_ADMIN", "FLOAT_POOL_COORDINATOR"]
  },
  CREDENTIAL_EXPIRING: {
    category: "CREDENTIAL",
    priority: "HIGH",
    eligibleRoles: ["CREDENTIALING_ADMIN", "UNIT_MANAGER", "WORKFORCE_ADMIN"]
  },
  INTEGRATION_ATTENTION: {
    category: "INTEGRATION",
    priority: "HIGH",
    eligibleRoles: ["SYSTEM_ADMIN", "ORGANIZATION_OWNER"]
  },
  AI_SAFETY_REVIEW: {
    category: "AI_SAFETY",
    priority: "URGENT",
    eligibleRoles: ["SYSTEM_ADMIN", "ORGANIZATION_OWNER", "COMPLIANCE_AUDITOR"]
  }
};

@Injectable()
export class NotificationEventPublisher {
  constructor(
    @Inject(NotificationService) private readonly notifications: NotificationService,
    @Inject(AuditService) private readonly auditLogs: AuditService
  ) {}

  async publish(input: {
    organizationId: string;
    actorUserId: string;
    recipientUserId: string;
    event: WorkflowNotificationEvent;
    payload: Record<string, string>;
  }) {
    const definition = workflowNotificationDefinitions[input.event];
    const recipient = demoSessions.find(
      (session) =>
        session.userId === input.recipientUserId && session.organizationId === input.organizationId
    );

    if (!recipient || !definition.eligibleRoles.includes(recipient.role)) {
      await this.auditLogs.append({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        actorType: "SYSTEM",
        action: "notification.delivery_skipped",
        objectType: "Notification",
        objectId: input.event,
        after: {
          recipientUserId: input.recipientUserId,
          event: input.event,
          reason: "recipient_role_out_of_scope"
        }
      });
      return null;
    }

    const notification = await this.notifications.create({
      organizationId: input.organizationId,
      recipientUserId: input.recipientUserId,
      type: input.event,
      category: definition.category,
      priority: definition.priority,
      payload: input.payload
    });

    await this.auditLogs.append({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorType: "SYSTEM",
      action: "notification.published",
      objectType: "Notification",
      objectId: notification.id,
      after: {
        recipientUserId: input.recipientUserId,
        event: input.event,
        category: definition.category,
        priority: definition.priority
      }
    });

    return notification;
  }
}
