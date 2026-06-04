import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import {
  OrganizationSettingsUpdateSchema,
  OrganizationSummarySchema,
  type OrganizationAdminServiceContract,
  type OrganizationSettingsUpdate,
  type OrganizationSummary
} from "./admin-contracts";
import { adminOrganizations, appendAdminAuditEvent } from "./admin-state";

@Injectable()
export class OrganizationAdminService implements OrganizationAdminServiceContract {
  async getSummary(organizationId: string) {
    return this.organizationFor(organizationId);
  }

  async updateSettings(organizationId: string, input: OrganizationSettingsUpdate) {
    const parsed = OrganizationSettingsUpdateSchema.parse(input);
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
    const organization = this.organizationFor(organizationId);
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
