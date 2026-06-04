import { Injectable, NotFoundException } from "@nestjs/common";

import {
  UnitMutationSchema,
  UnitRecordSchema,
  type UnitAdminServiceContract,
  type UnitMutation,
  type UnitRecord
} from "./admin-contracts";
import { adminFacilities, adminUnits, appendAdminAuditEvent } from "./admin-state";

@Injectable()
export class UnitAdminService implements UnitAdminServiceContract {
  async list(organizationId: string, facilityId?: string) {
    return adminUnits
      .filter((unit) => this.facilityBelongsToOrg(organizationId, unit.facilityId))
      .filter((unit) => !facilityId || unit.facilityId === facilityId)
      .map((unit) => UnitRecordSchema.parse(unit));
  }

  async create(organizationId: string, input: UnitMutation) {
    const parsed = UnitMutationSchema.parse(input);
    this.assertFacility(organizationId, parsed.facilityId);
    const unit: UnitRecord = {
      id: `unit_${adminUnits.length + 1}`,
      facilityId: parsed.facilityId,
      name: parsed.name,
      type: parsed.type,
      managerUserIds: parsed.managerUserIds,
      active: true
    };
    adminUnits.push(unit);
    appendAdminAuditEvent({
      organizationId,
      action: "admin.unit.created",
      objectType: "Unit",
      objectId: unit.id,
      reason: parsed.reason,
      after: unit
    });
    return UnitRecordSchema.parse(unit);
  }

  async update(organizationId: string, unitId: string, input: UnitMutation) {
    const parsed = UnitMutationSchema.parse(input);
    this.assertFacility(organizationId, parsed.facilityId);
    const unit = this.unitFor(organizationId, unitId);
    unit.facilityId = parsed.facilityId;
    unit.name = parsed.name;
    unit.type = parsed.type;
    unit.managerUserIds = parsed.managerUserIds;
    appendAdminAuditEvent({
      organizationId,
      action: "admin.unit.updated",
      objectType: "Unit",
      objectId: unitId,
      reason: parsed.reason,
      after: UnitRecordSchema.parse(unit)
    });
    return UnitRecordSchema.parse(unit);
  }

  async assignManagers(organizationId: string, unitId: string, managerUserIds: string[], reason: string) {
    const unit = this.unitFor(organizationId, unitId);
    unit.managerUserIds = managerUserIds;
    appendAdminAuditEvent({
      organizationId,
      action: "admin.unit.managers_assigned",
      objectType: "Unit",
      objectId: unitId,
      reason,
      after: { managerUserIds }
    });
    return UnitRecordSchema.parse(unit);
  }

  async deactivate(organizationId: string, unitId: string, reason: string) {
    const unit = this.unitFor(organizationId, unitId);
    unit.active = false;
    appendAdminAuditEvent({
      organizationId,
      action: "admin.unit.deactivated",
      objectType: "Unit",
      objectId: unitId,
      reason,
      after: UnitRecordSchema.parse(unit)
    });
    return UnitRecordSchema.parse(unit);
  }

  private unitFor(organizationId: string, unitId: string) {
    const unit = adminUnits.find(
      (candidate) => candidate.id === unitId && this.facilityBelongsToOrg(organizationId, candidate.facilityId)
    );
    if (!unit) {
      throw new NotFoundException("Unit not found");
    }
    return unit;
  }

  private assertFacility(organizationId: string, facilityId: string) {
    if (!this.facilityBelongsToOrg(organizationId, facilityId)) {
      throw new NotFoundException("Facility not found");
    }
  }

  private facilityBelongsToOrg(organizationId: string, facilityId: string) {
    return adminFacilities.some(
      (facility) => facility.id === facilityId && facility.organizationId === organizationId
    );
  }
}
