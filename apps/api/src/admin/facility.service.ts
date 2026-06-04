import { Injectable, NotFoundException } from "@nestjs/common";

import {
  FacilityMutationSchema,
  FacilityRecordSchema,
  type FacilityAdminServiceContract,
  type FacilityMutation,
  type FacilityRecord
} from "./admin-contracts";
import { adminFacilities } from "./admin-state";

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
    return FacilityRecordSchema.parse(facility);
  }

  async update(organizationId: string, facilityId: string, input: FacilityMutation) {
    const parsed = FacilityMutationSchema.parse(input);
    const facility = this.facilityFor(organizationId, facilityId);
    facility.name = parsed.name;
    facility.timezone = parsed.timezone;
    return FacilityRecordSchema.parse(facility);
  }

  async deactivate(organizationId: string, facilityId: string, _reason: string) {
    const facility = this.facilityFor(organizationId, facilityId);
    facility.status = "INACTIVE";
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
