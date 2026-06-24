import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@pulseshift/db";

import {
  OrganizationSettingsUpdateSchema,
  OrganizationSummarySchema,
  type OrganizationAdminServiceContract,
  type OrganizationSettingsUpdate,
  type OrganizationSummary
} from "./admin-contracts";
import { adminOrganizations, appendAdminAuditEvent } from "./admin-state";

function usePrismaAdmin() {
  return process.env.AUTH_PERSISTENCE === "prisma" || process.env.WORKFLOW_PERSISTENCE === "prisma";
}

@Injectable()
export class OrganizationAdminService implements OrganizationAdminServiceContract {
  async setupProgress(organizationId: string) {
    if (!usePrismaAdmin()) {
      return {
        completed: 6,
        total: 6,
        items: [
          "structure",
          "workforceRoles",
          "invitations",
          "schedules",
          "integrations",
          "notifications"
        ].map((id) => ({ id, complete: true }))
      };
    }
    const [
      facilityCount,
      unitCount,
      workforceRoleCount,
      invitationCount,
      shiftCount,
      integrationOnboardingCount,
      notificationPreferenceCount
    ] = await Promise.all([
      prisma.facility.count({ where: { organizationId, status: "ACTIVE" } }),
      prisma.unit.count({
        where: { facility: { organizationId }, status: "ACTIVE" }
      }),
      prisma.workforceRole.count({ where: { organizationId } }),
      prisma.invitation.count({ where: { organizationId } }),
      prisma.shift.count({ where: { organizationId } }),
      prisma.user.count({
        where: {
          organizationId,
          integrationsOnboardingCompletedAt: { not: null }
        }
      }),
      prisma.notificationPreference.count({
        where: { user: { organizationId } }
      })
    ]);
    const items = [
      {
        id: "structure",
        label: "Organization structure",
        complete: facilityCount > 0 && unitCount > 0,
        href: "/app/admin/facilities"
      },
      {
        id: "workforceRoles",
        label: "Workforce roles",
        complete: workforceRoleCount > 0,
        href: "/onboarding/organization"
      },
      {
        id: "invitations",
        label: "Team invitations",
        complete: invitationCount > 0,
        href: "/app/admin/invitations"
      },
      {
        id: "schedules",
        label: "Initial schedule",
        complete: shiftCount > 0,
        href: "/app/manager"
      },
      {
        id: "integrations",
        label: "Integration review",
        complete: integrationOnboardingCount > 0,
        href: "/app/admin/integrations"
      },
      {
        id: "notifications",
        label: "Notification preferences",
        complete: notificationPreferenceCount > 0,
        href: "/app/admin/notifications"
      }
    ];
    return {
      completed: items.filter((item) => item.complete).length,
      total: items.length,
      items
    };
  }

  async getSummary(organizationId: string) {
    if (usePrismaAdmin()) {
      const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!organization) {
        throw new NotFoundException("Organization not found");
      }
      return OrganizationSummarySchema.parse({
        id: organization.id,
        name: organization.name,
        timezone: organization.timezone,
        status: organization.status
      });
    }
    return this.organizationFor(organizationId);
  }

  async updateSettings(organizationId: string, input: OrganizationSettingsUpdate) {
    const parsed = OrganizationSettingsUpdateSchema.parse(input);
    if (usePrismaAdmin()) {
      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          ...(parsed.name ? { name: parsed.name } : {}),
          ...(parsed.timezone ? { timezone: parsed.timezone } : {}),
          ...(parsed.status ? { status: parsed.status } : {})
        }
      });
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorType: "SYSTEM",
          action: "admin.organization.updated",
          objectType: "Organization",
          objectId: organizationId,
          reason: parsed.reason,
          after: { name: organization.name, timezone: organization.timezone, status: organization.status }
        }
      });
      return OrganizationSummarySchema.parse({
        id: organization.id,
        name: organization.name,
        timezone: organization.timezone,
        status: organization.status
      });
    }
    const organization = this.organizationFor(organizationId);
    if (parsed.name) {
      organization.name = parsed.name;
    }
    if (parsed.timezone) {
      organization.timezone = parsed.timezone;
    }
    if (parsed.status) {
      organization.status = parsed.status;
    }
    appendAdminAuditEvent({
      organizationId,
      action: "admin.organization.updated",
      objectType: "Organization",
      objectId: organizationId,
      reason: parsed.reason,
      after: OrganizationSummarySchema.parse(organization)
    });
    return OrganizationSummarySchema.parse(organization);
  }

  async assertActive(organizationId: string) {
    const organization = await this.getSummary(organizationId);
    if (organization.status === "SUSPENDED") {
      throw new ForbiddenException("Organization is suspended");
    }
    return organization;
  }

  private organizationFor(organizationId: string): OrganizationSummary {
    const organization = adminOrganizations.find((candidate) => candidate.id === organizationId);
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }
    return OrganizationSummarySchema.parse(organization);
  }
}
