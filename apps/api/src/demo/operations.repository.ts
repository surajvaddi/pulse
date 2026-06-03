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
    const openShifts = await prisma.shift.findMany({
      where: {
        organizationId: query.organizationId,
        status: "OPEN",
        ...(query.unitId ? { unitId: query.unitId } : {})
      },
      include: {
        roleRequired: { select: { name: true } }
      }
    });
    return openShifts.map((shift): StaffingGapRecord => ({
      id: `gap_${shift.unitId}_${shift.roleRequired.name}`,
      unitId: shift.unitId,
      role: shift.roleRequired.name,
      requiredCount: 1,
      assignedCount: 0,
      gapCount: 1,
      severity: "HIGH",
      recommendedActions: ["Review qualified staff", "Broadcast to eligible employees"]
    }));
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
