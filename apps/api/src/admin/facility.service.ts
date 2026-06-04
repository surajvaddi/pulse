import { Injectable, NotFoundException } from "@nestjs/common";

import {
  FacilityMutationSchema,
  FacilityRecordSchema,
  type FacilityAdminServiceContract,
  type FacilityMutation,
  type FacilityRecord
} from "./admin-contracts";
import { adminFacilities, appendAdminAuditEvent } from "./admin-state";

@Injectable()
export class FacilityAdminService implements FacilityAdminServiceContract {
  async list(organizationId: string) {
    return adminFacilities
      .filter((facility) => facility.organizationId === organizationId)
      .map((facility) => FacilityRecordSchema.parse(facility));
  }

  async create(organizationId: string, input: FacilityMutation) {
    const parsed = FacilityMutationSchema.parse(input);
    const facility: FacilityRecord = {
      id: `fac_${adminFacilities.length + 1}`,
      organizationId,
      name: parsed.name,
      timezone: parsed.timezone,
      status: "ACTIVE"
    };
    adminFacilities.push(facility);
    appendAdminAuditEvent({
      organizationId,
      action: "admin.facility.created",
      objectType: "Facility",
      objectId: facility.id,
      reason: parsed.reason,
      after: facility
    });
    return FacilityRecordSchema.parse(facility);
  }

  async update(organizationId: string, facilityId: string, input: FacilityMutation) {
    const parsed = FacilityMutationSchema.parse(input);
    const facility = this.facilityFor(organizationId, facilityId);
    facility.name = parsed.name;
    facility.timezone = parsed.timezone;
    appendAdminAuditEvent({
      organizationId,
      action: "admin.facility.updated",
      objectType: "Facility",
      objectId: facilityId,
      reason: parsed.reason,
      after: FacilityRecordSchema.parse(facility)
    });
    return FacilityRecordSchema.parse(facility);
  }

  async deactivate(organizationId: string, facilityId: string, reason: string) {
    const facility = this.facilityFor(organizationId, facilityId);
    facility.status = "INACTIVE";
    appendAdminAuditEvent({
      organizationId,
      action: "admin.facility.deactivated",
      objectType: "Facility",
      objectId: facilityId,
      reason,
      after: FacilityRecordSchema.parse(facility)
    });
    return FacilityRecordSchema.parse(facility);
  }

  private facilityFor(organizationId: string, facilityId: string) {
    const facility = adminFacilities.find(
      (candidate) => candidate.id === facilityId && candidate.organizationId === organizationId
    );
    if (!facility) {
      throw new NotFoundException("Facility not found");
    }
    return facility;
  }
}
