import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import type { DemoSession } from "../auth/demo-users";
import { CurrentSession } from "../auth/session.decorator";
import {
  appendDemoAuditLog,
  demoCredentials,
  demoSchedules,
  demoStaffDirectory,
  demoTimecardExceptions
} from "./demo-data";

@Controller("operations")
export class OperationsController {
  @Get("staffing/gaps")
  staffingGaps(@CurrentSession() _session: DemoSession) {
    const openShift = demoSchedules.find((shift) => shift.id === "shift_open_icu_night");
    return [
      {
        id: "gap_icu_rn_night",
        unitId: "unit_icu",
        role: "RN",
        requiredCount: 2,
        assignedCount: 1,
        gapCount: openShift?.status === "OPEN" ? 1 : 0,
        severity: openShift?.status === "OPEN" ? "HIGH" : "RESOLVED",
        recommendedActions: ["Assign Nina Patel", "Ask float pool", "Broadcast to ICU-qualified RNs"]
      }
    ];
  }

  @Get("staffing/gaps/:gapId/candidates")
  coverageCandidates(@Param("gapId") gapId: string) {
    return {
      gapId,
      candidates: demoStaffDirectory
        .filter((employee) => employee.unitId === "unit_icu" && employee.overtimeRisk !== "HIGH")
        .map((employee) => ({
          employeeId: employee.employeeId,
          name: employee.name,
          role: employee.role,
          eligibility: "QUALIFIED",
          availability: employee.availability,
          overtimeRisk: employee.overtimeRisk
        }))
    };
  }

  @Get("credentials/warnings")
  credentialWarnings() {
    return demoCredentials.filter((credential) => credential.status !== "VERIFIED");
  }

  @Get("staff")
  staffDirectory(@CurrentSession() session: DemoSession) {
    if (session.role === "EMPLOYEE") {
      return demoStaffDirectory.map((employee) => ({
        employeeId: employee.employeeId,
        name: employee.name,
        eligibility: employee.certifications.includes("ICU Qualified") ? "ICU qualified" : "Limited",
        availability: employee.availability,
        overtimeRisk: employee.overtimeRisk
      }));
    }

    return demoStaffDirectory;
  }

  @Post("timecards/exceptions/:exceptionId/resolve")
  resolveTimecard(
    @CurrentSession() session: DemoSession,
    @Param("exceptionId") exceptionId: string,
    @Body() body: { resolution?: string }
  ) {
    const exception = demoTimecardExceptions.find((candidate) => candidate.id === exceptionId);
    if (!exception) {
      return { status: "NOT_FOUND", exceptionId };
    }
    exception.status = "RESOLVED";
    appendDemoAuditLog({
      actorUserId: session.userId,
      actorType: "USER",
      action: "timecard.exception_resolved",
      objectType: "TimecardException",
      objectId: exceptionId,
      reason: body.resolution ?? "Resolved through payroll queue",
      after: { status: exception.status }
    });
    return exception;
  }
}
