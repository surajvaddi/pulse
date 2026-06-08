import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@pulseshift/db";

import {
  FacilityMutationSchema,
  FacilityRecordSchema,
  type FacilityAdminServiceContract,
  type FacilityMutation,
  type FacilityRecord
} from "./admin-contracts";
import { adminFacilities, appendAdminAuditEvent } from "./admin-state";

function usePrismaAdmin() {
  return process.env.AUTH_PERSISTENCE === "prisma" || process.env.WORKFLOW_PERSISTENCE === "prisma";
}

@Injectable()
export class FacilityAdminService implements FacilityAdminServiceContract {
  async list(organizationId: string) {
    if (usePrismaAdmin()) {
      const facilities = await prisma.facility.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
      return facilities.map((facility) =>
        FacilityRecordSchema.parse({
          id: facility.id,
          organizationId: facility.organizationId,
          name: facility.name,
          timezone: facility.timezone,
          status: facility.status
        })
      );
    }
    return adminFacilities
      .filter((facility) => facility.organizationId === organizationId)
      .map((facility) => FacilityRecordSchema.parse(facility));
  }

  async create(organizationId: string, input: FacilityMutation) {
    const parsed = FacilityMutationSchema.parse(input);
    if (usePrismaAdmin()) {
      const facility = await prisma.facility.create({
        data: {
          organizationId,
          name: parsed.name,
          timezone: parsed.timezone,
          status: "ACTIVE"
        }
      });
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorType: "SYSTEM",
          action: "admin.facility.created",
          objectType: "Facility",
          objectId: facility.id,
          reason: parsed.reason,
          after: { id: facility.id, name: facility.name, timezone: facility.timezone }
        }
      });
      return FacilityRecordSchema.parse({
        id: facility.id,
        organizationId: facility.organizationId,
        name: facility.name,
        timezone: facility.timezone,
        status: facility.status
      });
    }
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
    if (usePrismaAdmin()) {
      await this.assertPrismaFacility(organizationId, facilityId);
      const facility = await prisma.facility.update({
        where: { id: facilityId },
        data: { name: parsed.name, timezone: parsed.timezone }
      });
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorType: "SYSTEM",
          action: "admin.facility.updated",
          objectType: "Facility",
          objectId: facilityId,
          reason: parsed.reason,
          after: { id: facility.id, name: facility.name, timezone: facility.timezone }
        }
      });
      return FacilityRecordSchema.parse({
        id: facility.id,
        organizationId: facility.organizationId,
        name: facility.name,
        timezone: facility.timezone,
        status: facility.status
      });
    }
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
    if (usePrismaAdmin()) {
      await this.assertPrismaFacility(organizationId, facilityId);
      const facility = await prisma.facility.update({
        where: { id: facilityId },
        data: { status: "INACTIVE" }
      });
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorType: "SYSTEM",
          action: "admin.facility.deactivated",
          objectType: "Facility",
          objectId: facilityId,
          reason,
          after: { id: facility.id, status: facility.status }
        }
      });
      return FacilityRecordSchema.parse({
        id: facility.id,
        organizationId: facility.organizationId,
        name: facility.name,
        timezone: facility.timezone,
        status: facility.status
      });
    }
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

  private async assertPrismaFacility(organizationId: string, facilityId: string) {
    const facility = await prisma.facility.findFirst({ where: { id: facilityId, organizationId } });
    if (!facility) {
      throw new NotFoundException("Facility not found");
    }
    return facility;
  }
}
