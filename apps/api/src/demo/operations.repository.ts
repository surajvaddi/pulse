import { Inject, Injectable } from "@nestjs/common";
import { prisma } from "@pulseshift/db";

import {
  demoCredentials,
  demoSchedules,
  demoStaffDirectory,
  demoTimecardExceptions
} from "./demo-data";
import type {
  CoverageCandidateRecord,
  CredentialWarningRecord,
  OperationsRepository,
  StaffDirectoryRecord,
  StaffingGapRecord,
  TimecardExceptionRecord
} from "../workflows/repository-contracts";

function persistenceEnabled() {
  return process.env.WORKFLOW_PERSISTENCE === "prisma";
}

function limitedStaffView(employee: {
  employeeId: string;
  name: string;
  role: string;
  availability: string;
  overtimeRisk: string;
  certifications?: string[];
}): StaffDirectoryRecord {
  return {
    employeeId: employee.employeeId,
    name: employee.name,
    role: employee.role,
    eligibility: employee.certifications?.includes("ICU Qualified") ? "ICU qualified" : "Limited",
    availability: employee.availability,
    overtimeRisk: employee.overtimeRisk
  };
}

function mapDemoStaff(employee: (typeof demoStaffDirectory)[number]): StaffDirectoryRecord {
  return {
    employeeId: employee.employeeId,
    name: employee.name,
    role: employee.role,
    unitId: employee.unitId,
    certifications: employee.certifications,
    eligibility: employee.certifications.includes("ICU Qualified") ? "QUALIFIED" : "LIMITED",
    availability: employee.availability,
    overtimeRisk: employee.overtimeRisk
  };
}

export function calculateCoverageGap(input: {
  id: string;
  unitId: string;
  role: string;
  roleId: string;
  requiredCount: number;
  certificationRequiredIds: string[];
  startsAt: string;
  endsAt: string;
  slots: Array<{
    status: string;
    assignments: Array<{
      status: string;
      employee: {
        roleId: string;
        certifications: Array<{
          certificationId: string;
          status: string;
          expiresAt?: string | null;
        }>;
        availabilityWindows: Array<{
          type: string;
          status: string;
          startsAt: string;
          endsAt: string;
        }>;
      };
    }>;
  }>;
}): StaffingGapRecord {
  const startsAt = new Date(input.startsAt);
  const assignedCount = input.slots.reduce((total, slot) => {
    if (slot.status === "CANCELLED") return total;
    const qualifiedAssignments = slot.assignments.filter((assignment) => {
      if (assignment.status !== "ACTIVE") return false;
      const employee = assignment.employee;
      if (employee.roleId !== input.roleId) return false;
      const qualified = input.certificationRequiredIds.every((requiredId) =>
        employee.certifications.some(
          (credential) =>
            credential.certificationId === requiredId &&
            credential.status === "VERIFIED" &&
            (!credential.expiresAt ||
              new Date(credential.expiresAt) > startsAt)
        )
      );
      const absent = employee.availabilityWindows.some(
        (window) =>
          window.status === "ACTIVE" &&
          window.type === "UNAVAILABLE" &&
          new Date(window.startsAt) < new Date(input.endsAt) &&
          new Date(window.endsAt) > startsAt
      );
      return qualified && !absent;
    });
    return total + qualifiedAssignments.length;
  }, 0);
  const gapCount = Math.max(0, input.requiredCount - assignedCount);
  const openSlots = input.slots.filter((slot) => slot.status === "OPEN").length;
  return {
    id: `gap_${input.id}`,
    unitId: input.unitId,
    role: input.role,
    requiredCount: input.requiredCount,
    assignedCount,
    gapCount,
    severity:
      assignedCount > input.requiredCount
        ? "OVERSTAFFED"
        : gapCount === 0
          ? "RESOLVED"
          : gapCount >= 2
            ? "HIGH"
            : "MEDIUM",
    recommendedActions:
      gapCount > 0
        ? [
            `${openSlots} open slot${openSlots === 1 ? "" : "s"} available`,
            "Review qualified staff",
            "Broadcast to eligible employees"
          ]
        : assignedCount > input.requiredCount
          ? ["Review surplus coverage before publishing"]
          : ["Coverage requirement is satisfied"]
  };
}

@Injectable()
export class InMemoryOperationsRepository implements OperationsRepository {
  async listStaffingGaps(query: { organizationId: string; unitId?: string }) {
    const openShift = demoSchedules.find((shift) => shift.id === "shift_open_icu_night");
    const gap: StaffingGapRecord = {
      id: "gap_icu_rn_night",
      unitId: "unit_icu",
      role: "RN",
      requiredCount: 2,
      assignedCount: 1,
      gapCount: openShift?.status === "OPEN" ? 1 : 0,
      severity: openShift?.status === "OPEN" ? "HIGH" : "RESOLVED",
      recommendedActions: ["Assign Nina Patel", "Ask float pool", "Broadcast to ICU-qualified RNs"]
    };
    return query.unitId && query.unitId !== gap.unitId ? [] : [gap];
  }

  async listCoverageCandidates(_query: { organizationId: string; gapId: string }) {
    return demoStaffDirectory
      .filter((employee) => employee.unitId === "unit_icu" && employee.overtimeRisk !== "HIGH")
      .map((employee): CoverageCandidateRecord => ({
        employeeId: employee.employeeId,
        name: employee.name,
        role: employee.role,
        eligibility: "QUALIFIED",
        availability: employee.availability,
        overtimeRisk: employee.overtimeRisk
      }));
  }

  async listCredentialWarnings(_query: { organizationId: string; unitId?: string }) {
    return demoCredentials.filter((credential) => credential.status !== "VERIFIED");
  }

  async listStaff(query: { organizationId: string; unitId?: string; limitedView?: boolean }) {
    const staff = query.unitId
      ? demoStaffDirectory.filter((employee) => employee.unitId === query.unitId)
      : demoStaffDirectory;
    const records = staff.map(mapDemoStaff);
    if (query.limitedView) {
      return records.map((employee) => limitedStaffView(employee));
    }
    return records;
  }

  async listTimecardExceptions(query: {
    organizationId: string;
    userId?: string;
    unitId?: string;
    status?: string;
  }) {
    return demoTimecardExceptions.filter((exception) => {
      if (query.userId && exception.userId !== query.userId) {
        return false;
      }
      if (query.unitId && exception.unitId !== query.unitId) {
        return false;
      }
      if (query.status && exception.status !== query.status) {
        return false;
      }
      return true;
    });
  }

  async resolveTimecardException(input: {
    organizationId: string;
    exceptionId: string;
    resolution: string;
  }) {
    const exception = demoTimecardExceptions.find((candidate) => candidate.id === input.exceptionId);
    if (!exception) {
      return {
        id: input.exceptionId,
        employeeId: "",
        userId: "",
        unitId: "",
        type: "NOT_FOUND",
        severity: "LOW",
        status: "NOT_FOUND",
        explanation: input.resolution
      };
    }
    exception.status = "RESOLVED";
    return exception;
  }
}

@Injectable()
export class PrismaOperationsRepository implements OperationsRepository {
  async listStaffingGaps(query: { organizationId: string; unitId?: string }) {
    const requirements = await prisma.staffingRequirement.findMany({
      where: {
        unit: { facility: { organizationId: query.organizationId } },
        ...(query.unitId ? { unitId: query.unitId } : {})
      },
      include: {
        role: { select: { name: true } },
        shiftSlots: {
          include: {
            assignments: {
              where: { status: "ACTIVE" },
              include: {
                employee: {
                  include: {
                    certifications: true,
                    availabilityWindows: {
                      where: { status: "ACTIVE", type: "UNAVAILABLE" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return requirements.map((requirement) =>
      calculateCoverageGap({
        id: requirement.id,
        unitId: requirement.unitId,
        role: requirement.role.name,
        roleId: requirement.roleId,
        requiredCount: requirement.minRequired,
        certificationRequiredIds: requirement.certificationRequiredIds,
        startsAt: requirement.startAt.toISOString(),
        endsAt: requirement.endAt.toISOString(),
        slots: requirement.shiftSlots.map((slot) => ({
          status: slot.status,
          assignments: slot.assignments.map((assignment) => ({
            status: assignment.status,
            employee: {
              roleId: assignment.employee.roleId,
              certifications: assignment.employee.certifications.map(
                (credential) => ({
                  certificationId: credential.certificationId,
                  status: credential.status,
                  expiresAt: credential.expiresAt?.toISOString() ?? null
                })
              ),
              availabilityWindows:
                assignment.employee.availabilityWindows.map((window) => ({
                  type: window.type,
                  status: window.status,
                  startsAt: window.startAt.toISOString(),
                  endsAt: window.endAt.toISOString()
                }))
            }
          }))
        }))
      })
    );
  }

  async listCoverageCandidates(query: { organizationId: string; gapId: string }) {
    const employees = await prisma.employeeProfile.findMany({
      where: {
        organizationId: query.organizationId,
        status: "ACTIVE"
      },
      include: {
        role: { select: { name: true } }
      },
      take: 25
    });
    return employees.map((employee): CoverageCandidateRecord => ({
      employeeId: employee.id,
      name: employee.preferredName ?? employee.legalName,
      role: employee.role.name,
      eligibility: "QUALIFIED",
      availability: "Review availability",
      overtimeRisk: "UNKNOWN"
    }));
  }

  async listCredentialWarnings(query: { organizationId: string; unitId?: string }) {
    const certifications = await prisma.employeeCertification.findMany({
      where: {
        employee: {
          organizationId: query.organizationId,
          ...(query.unitId ? { primaryUnitId: query.unitId } : {})
        },
        OR: [
          { status: { not: "VERIFIED" } },
          { expiresAt: { lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } }
        ]
      },
      include: {
        employee: { select: { id: true, legalName: true, preferredName: true } },
        certification: { select: { name: true } }
      }
    });
    return certifications.map((credential): CredentialWarningRecord => ({
      employeeId: credential.employee.id,
      employeeName: credential.employee.preferredName ?? credential.employee.legalName,
      certification: credential.certification.name,
      status: credential.status,
      expiresAt: credential.expiresAt?.toISOString() ?? null
    }));
  }

  async listStaff(query: { organizationId: string; unitId?: string; limitedView?: boolean }) {
    const employees = await prisma.employeeProfile.findMany({
      where: {
        organizationId: query.organizationId,
        ...(query.unitId ? { primaryUnitId: query.unitId } : {})
      },
      include: {
        role: { select: { name: true } },
        certifications: { include: { certification: { select: { name: true } } } }
      },
      orderBy: { legalName: "asc" }
    });
    const staff = employees.map((employee): StaffDirectoryRecord => ({
      employeeId: employee.id,
      name: employee.preferredName ?? employee.legalName,
      role: employee.role.name,
      unitId: employee.primaryUnitId,
      certifications: employee.certifications.map((credential) => credential.certification.name),
      eligibility: "QUALIFIED",
      availability: "Review schedule",
      overtimeRisk: "UNKNOWN"
    }));
    if (query.limitedView) {
      return staff.map((employee) => limitedStaffView(employee));
    }
    return staff;
  }

  async listTimecardExceptions(query: {
    organizationId: string;
    userId?: string;
    unitId?: string;
    status?: string;
  }) {
    const exceptions = await prisma.timecardException.findMany({
      where: {
        employee: {
          organizationId: query.organizationId,
          ...(query.userId ? { userId: query.userId } : {}),
          ...(query.unitId ? { primaryUnitId: query.unitId } : {})
        },
        ...(query.status ? { status: query.status as "OPEN" | "RESOLVED" | "DISMISSED" } : {})
      },
      include: {
        employee: { select: { id: true, userId: true, primaryUnitId: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return exceptions.map((exception): TimecardExceptionRecord => ({
      id: exception.id,
      employeeId: exception.employee.id,
      userId: exception.employee.userId ?? "",
      unitId: exception.employee.primaryUnitId,
      type: exception.exceptionType,
      severity: exception.severity,
      status: exception.status,
      explanation: exception.explanation ?? ""
    }));
  }

  async resolveTimecardException(input: {
    organizationId: string;
    exceptionId: string;
    resolution: string;
  }) {
    const exception = await prisma.timecardException.update({
      where: { id: input.exceptionId },
      data: { status: "RESOLVED", explanation: input.resolution },
      include: {
        employee: { select: { id: true, userId: true, primaryUnitId: true } }
      }
    });
    return {
      id: exception.id,
      employeeId: exception.employee.id,
      userId: exception.employee.userId ?? "",
      unitId: exception.employee.primaryUnitId,
      type: exception.exceptionType,
      severity: exception.severity,
      status: exception.status,
      explanation: exception.explanation ?? ""
    };
  }
}

@Injectable()
export class OperationsRepositoryProvider {
  constructor(
    @Inject(InMemoryOperationsRepository) private readonly memory: InMemoryOperationsRepository,
    @Inject(PrismaOperationsRepository) private readonly persistent: PrismaOperationsRepository
  ) {}

  repository() {
    return persistenceEnabled() ? this.persistent : this.memory;
  }
}
