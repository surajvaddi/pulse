import { PrismaClient } from "../src/generated/client/index.js";

const prisma = new PrismaClient();

const ids = {
  org: "org_pulseshift_demo",
  facilityMain: "fac_mercy_main",
  facilityNorth: "fac_mercy_north",
  unitIcu: "unit_icu",
  unitEd: "unit_ed",
  unitMedSurg: "unit_med_surg",
  roleRn: "role_rn",
  roleTech: "role_tech",
  certBls: "cert_bls",
  certAcls: "cert_acls",
  certIcu: "cert_icu",
  userPriya: "user_priya",
  userMaya: "user_maya",
  userJordan: "user_jordan_manager",
  userPayroll: "user_payroll",
  userAdmin: "user_admin",
  empPriya: "emp_priya",
  empMaya: "emp_maya",
  empNina: "emp_nina",
  shiftPriyaFriday: "shift_priya_friday_icu_night",
  shiftMayaSaturday: "shift_maya_saturday_icu_day",
  shiftOpenIcuNight: "shift_open_icu_night",
  staffingReqIcuNight: "staffing_icu_night_req",
  timecardLateClockIn: "timecard_event_priya_late_clock_in",
  timecardClockOut: "timecard_event_priya_clock_out",
  timecardLate: "timecard_exception_late_priya",
  conversation: "ai_convo_priya_demo",
  toolCall: "ai_tool_call_schedule_lookup",
  auditSeed: "audit_seed_demo"
};

const baseFridayNight = new Date("2026-05-29T23:00:00.000Z");
const baseSaturdayMorning = new Date("2026-05-30T11:00:00.000Z");
const baseSaturdayDay = new Date("2026-05-30T12:00:00.000Z");
const baseSaturdayEvening = new Date("2026-05-31T00:00:00.000Z");

async function main() {
  await prisma.organization.upsert({
    where: { id: ids.org },
    update: {},
    create: {
      id: ids.org,
      name: "Mercy Regional Health",
      timezone: "America/New_York",
      status: "TRIAL",
      defaultPolicySetId: "policy_default_demo"
    }
  });

  await prisma.facility.createMany({
    data: [
      {
        id: ids.facilityMain,
        organizationId: ids.org,
        name: "Mercy Main Hospital",
        address: "100 Care Way",
        timezone: "America/New_York",
        status: "ACTIVE"
      },
      {
        id: ids.facilityNorth,
        organizationId: ids.org,
        name: "Mercy North Clinic",
        address: "24 North Clinic Drive",
        timezone: "America/New_York",
        status: "ACTIVE"
      }
    ],
    skipDuplicates: true
  });

  await prisma.unit.createMany({
    data: [
      {
        id: ids.unitIcu,
        facilityId: ids.facilityMain,
        name: "ICU",
        unitType: "ICU",
        managerUserIds: [ids.userJordan],
        defaultStaffingPolicyId: "policy_icu_demo",
        status: "ACTIVE"
      },
      {
        id: ids.unitEd,
        facilityId: ids.facilityMain,
        name: "Emergency Department",
        unitType: "ED",
        managerUserIds: [ids.userJordan],
        status: "ACTIVE"
      },
      {
        id: ids.unitMedSurg,
        facilityId: ids.facilityNorth,
        name: "Med-Surg",
        unitType: "MED_SURG",
        managerUserIds: [],
        status: "ACTIVE"
      }
    ],
    skipDuplicates: true
  });

  await prisma.workforceRole.createMany({
    data: [
      {
        id: ids.roleRn,
        organizationId: ids.org,
        name: "RN",
        description: "Registered nurse"
      },
      {
        id: ids.roleTech,
        organizationId: ids.org,
        name: "TECH",
        description: "Clinical technician"
      }
    ],
    skipDuplicates: true
  });

  await prisma.certification.createMany({
    data: [
      { id: ids.certBls, organizationId: ids.org, name: "BLS", code: "BLS", expires: true },
      { id: ids.certAcls, organizationId: ids.org, name: "ACLS", code: "ACLS", expires: true },
      {
        id: ids.certIcu,
        organizationId: ids.org,
        name: "ICU Qualified",
        code: "ICU",
        expires: false
      }
    ],
    skipDuplicates: true
  });

  await prisma.user.createMany({
    data: [
      {
        id: ids.userPriya,
        organizationId: ids.org,
        email: "priya.nurse@example.com",
        supabaseAuthId: "supabase_user_priya",
        displayName: "Priya Raman",
        phone: "+15555550100",
        authProvider: "PASSWORD",
        status: "ACTIVE"
      },
      {
        id: ids.userMaya,
        organizationId: ids.org,
        email: "maya.shah@example.com",
        supabaseAuthId: "supabase_user_maya",
        displayName: "Maya Shah",
        phone: "+15555550101",
        authProvider: "PASSWORD",
        status: "ACTIVE"
      },
      {
        id: ids.userJordan,
        organizationId: ids.org,
        email: "jordan.manager@example.com",
        supabaseAuthId: "supabase_user_jordan_manager",
        displayName: "Jordan Lee",
        authProvider: "PASSWORD",
        status: "ACTIVE"
      },
      {
        id: ids.userPayroll,
        organizationId: ids.org,
        email: "payroll@example.com",
        supabaseAuthId: "supabase_user_payroll",
        displayName: "Sam Payroll",
        authProvider: "PASSWORD",
        status: "ACTIVE"
      },
      {
        id: ids.userAdmin,
        organizationId: ids.org,
        email: "admin@example.com",
        supabaseAuthId: "supabase_user_admin",
        displayName: "Alex Admin",
        authProvider: "PASSWORD",
        status: "ACTIVE"
      }
    ],
    skipDuplicates: true
  });

  await prisma.userRole.createMany({
    data: [
      {
        userId: ids.userPriya,
        role: "EMPLOYEE",
        scope: { type: "SELF" },
        permissions: [
          "schedule:read:self",
          "shift:claim",
          "shift:release",
          "shift:swap:create",
          "availability:read:self",
          "availability:write:self",
          "timecard:read:self",
          "timecard:write:self",
          "ai:use"
        ]
      },
      {
        userId: ids.userMaya,
        role: "EMPLOYEE",
        scope: { type: "SELF" },
        permissions: [
          "schedule:read:self",
          "shift:swap:create",
          "timecard:read:self",
          "timecard:write:self",
          "ai:use"
        ]
      },
      {
        userId: ids.userJordan,
        role: "UNIT_MANAGER",
        scope: { type: "UNIT", unitIds: [ids.unitIcu, ids.unitEd] },
        permissions: [
          "schedule:read:unit",
          "shift:swap:approve",
          "shift:assign",
          "notification:send:unit",
          "timecard:read:unit",
          "ai:use"
        ]
      },
      {
        userId: ids.userPayroll,
        role: "PAYROLL_ADMIN",
        scope: { type: "FACILITY", facilityIds: [ids.facilityMain] },
        permissions: ["timecard:read:unit", "timecard:resolve", "payroll:export", "ai:use"]
      },
      {
        userId: ids.userAdmin,
        role: "SYSTEM_ADMIN",
        scope: { type: "ORG", organizationId: ids.org },
        permissions: ["integration:manage", "user:manage", "audit:read", "ai:admin", "ai:use"]
      }
    ],
    skipDuplicates: true
  });

  await prisma.employeeProfile.createMany({
    data: [
      {
        id: ids.empPriya,
        userId: ids.userPriya,
        organizationId: ids.org,
        employeeNumber: "E1001",
        legalName: "Priya Raman",
        preferredName: "Priya",
        primaryFacilityId: ids.facilityMain,
        primaryUnitId: ids.unitIcu,
        employmentType: "FULL_TIME",
        roleId: ids.roleRn,
        managerUserId: ids.userJordan,
        status: "ACTIVE",
        hireDate: new Date("2022-06-01T00:00:00.000Z")
      },
      {
        id: ids.empMaya,
        userId: ids.userMaya,
        organizationId: ids.org,
        employeeNumber: "E1002",
        legalName: "Maya Shah",
        preferredName: "Maya",
        primaryFacilityId: ids.facilityMain,
        primaryUnitId: ids.unitIcu,
        employmentType: "FULL_TIME",
        roleId: ids.roleRn,
        managerUserId: ids.userJordan,
        status: "ACTIVE",
        hireDate: new Date("2021-03-15T00:00:00.000Z")
      },
      {
        id: ids.empNina,
        organizationId: ids.org,
        employeeNumber: "E1003",
        legalName: "Nina Patel",
        preferredName: "Nina",
        primaryFacilityId: ids.facilityMain,
        primaryUnitId: ids.unitIcu,
        employmentType: "PER_DIEM",
        roleId: ids.roleRn,
        managerUserId: ids.userJordan,
        status: "ACTIVE",
        hireDate: new Date("2023-01-10T00:00:00.000Z")
      }
    ],
    skipDuplicates: true
  });

  await prisma.employeeCertification.createMany({
    data: [ids.empPriya, ids.empMaya, ids.empNina].flatMap((employeeId) => [
      {
        employeeId,
        certificationId: ids.certBls,
        status: "VERIFIED" as const,
        issuedAt: new Date("2025-01-01T00:00:00.000Z"),
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        verifiedByUserId: ids.userAdmin
      },
      {
        employeeId,
        certificationId: ids.certAcls,
        status: "VERIFIED" as const,
        issuedAt: new Date("2025-01-01T00:00:00.000Z"),
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        verifiedByUserId: ids.userAdmin
      },
      {
        employeeId,
        certificationId: ids.certIcu,
        status: "VERIFIED" as const,
        verifiedByUserId: ids.userAdmin
      }
    ]),
    skipDuplicates: true
  });

  await prisma.shiftTemplate.createMany({
    data: [
      {
        id: "template_icu_rn_night",
        unitId: ids.unitIcu,
        name: "ICU RN Night 7P-7A",
        startLocalTime: "19:00",
        endLocalTime: "07:00",
        durationMinutes: 720,
        roleRequiredId: ids.roleRn,
        certificationRequiredIds: [ids.certAcls, ids.certIcu],
        defaultBreakMinutes: 30
      },
      {
        id: "template_icu_rn_day",
        unitId: ids.unitIcu,
        name: "ICU RN Day 7A-7P",
        startLocalTime: "07:00",
        endLocalTime: "19:00",
        durationMinutes: 720,
        roleRequiredId: ids.roleRn,
        certificationRequiredIds: [ids.certAcls, ids.certIcu],
        defaultBreakMinutes: 30
      }
    ],
    skipDuplicates: true
  });

  await prisma.shift.createMany({
    data: [
      {
        id: ids.shiftPriyaFriday,
        organizationId: ids.org,
        facilityId: ids.facilityMain,
        unitId: ids.unitIcu,
        templateId: "template_icu_rn_night",
        roleRequiredId: ids.roleRn,
        certificationRequiredIds: [ids.certAcls, ids.certIcu],
        startAt: baseFridayNight,
        endAt: baseSaturdayMorning,
        assignedEmployeeId: ids.empPriya,
        status: "PUBLISHED",
        source: "TEMPLATE",
        riskFlags: []
      },
      {
        id: ids.shiftMayaSaturday,
        organizationId: ids.org,
        facilityId: ids.facilityMain,
        unitId: ids.unitIcu,
        templateId: "template_icu_rn_day",
        roleRequiredId: ids.roleRn,
        certificationRequiredIds: [ids.certAcls, ids.certIcu],
        startAt: baseSaturdayDay,
        endAt: baseSaturdayEvening,
        assignedEmployeeId: ids.empMaya,
        status: "PUBLISHED",
        source: "TEMPLATE",
        riskFlags: []
      },
      {
        id: ids.shiftOpenIcuNight,
        organizationId: ids.org,
        facilityId: ids.facilityMain,
        unitId: ids.unitIcu,
        templateId: "template_icu_rn_night",
        roleRequiredId: ids.roleRn,
        certificationRequiredIds: [ids.certAcls, ids.certIcu],
        startAt: new Date("2026-05-31T23:00:00.000Z"),
        endAt: new Date("2026-06-01T11:00:00.000Z"),
        status: "OPEN",
        source: "MANUAL",
        riskFlags: ["STAFFING_GAP"]
      }
    ],
    skipDuplicates: true
  });

  await prisma.availabilityWindow.createMany({
    data: [
      {
        employeeId: ids.empMaya,
        type: "AVAILABLE",
        startAt: baseFridayNight,
        endAt: baseSaturdayMorning,
        reason: "Available for swap demo",
        status: "ACTIVE"
      },
      {
        employeeId: ids.empNina,
        type: "AVAILABLE",
        startAt: new Date("2026-05-31T23:00:00.000Z"),
        endAt: new Date("2026-06-01T11:00:00.000Z"),
        reason: "Float coverage candidate",
        status: "ACTIVE"
      }
    ],
    skipDuplicates: true
  });

  await prisma.staffingRequirement.create({
    data: {
      id: ids.staffingReqIcuNight,
      unitId: ids.unitIcu,
      roleId: ids.roleRn,
      certificationRequiredIds: [ids.certAcls, ids.certIcu],
      startAt: baseFridayNight,
      endAt: baseSaturdayMorning,
      minRequired: 2,
      idealRequired: 3,
      source: "TEMPLATE"
    }
  }).catch(() => undefined);

  await prisma.timecardEvent.createMany({
    data: [
      {
        id: ids.timecardLateClockIn,
        employeeId: ids.empPriya,
        shiftId: ids.shiftPriyaFriday,
        eventType: "CLOCK_IN",
        occurredAt: new Date("2026-05-29T23:17:00.000Z"),
        source: "MOBILE",
        status: "FLAGGED"
      },
      {
        id: ids.timecardClockOut,
        employeeId: ids.empPriya,
        shiftId: ids.shiftPriyaFriday,
        eventType: "CLOCK_OUT",
        occurredAt: new Date("2026-05-30T11:03:00.000Z"),
        source: "MOBILE",
        status: "NORMAL"
      }
    ],
    skipDuplicates: true
  });

  await prisma.timecardException.create({
    data: {
      id: ids.timecardLate,
      employeeId: ids.empPriya,
      shiftId: ids.shiftPriyaFriday,
      exceptionType: "LATE_CLOCK_IN",
      severity: "MEDIUM",
      status: "OPEN",
      explanation: "Priya clocked in 17 minutes after the scheduled ICU night shift start."
    }
  }).catch(() => undefined);

  await prisma.notification.createMany({
    data: [
      {
        organizationId: ids.org,
        recipientUserId: ids.userJordan,
        channel: "IN_APP",
        type: "STAFFING_RISK",
        category: "STAFFING",
        priority: "HIGH",
        status: "QUEUED",
        payload: { unitId: ids.unitIcu, shiftId: ids.shiftOpenIcuNight }
      },
      {
        organizationId: ids.org,
        recipientUserId: ids.userPriya,
        channel: "IN_APP",
        type: "TIMECARD_EXCEPTION",
        category: "TIMECARD",
        priority: "HIGH",
        status: "QUEUED",
        payload: { exceptionId: ids.timecardLate }
      },
      {
        organizationId: ids.org,
        recipientUserId: ids.userAdmin,
        channel: "EMAIL",
        type: "APPROVAL_REQUIRED",
        category: "INTEGRATION",
        priority: "HIGH",
        status: "FAILED",
        payload: { connectionId: ids.integrationKronos },
        failureReason: "Provider rejected the delivery address",
        retryCount: 2,
        failedAt: new Date("2026-06-05T13:30:00.000Z"),
        lastAttemptedAt: new Date("2026-06-05T13:30:00.000Z"),
        nextRetryAt: new Date("2026-06-05T14:00:00.000Z"),
        providerMessageId: "demo-provider-failure-1",
        providerMetadata: { provider: "demo-email" }
      }
    ],
    skipDuplicates: true
  });

  await prisma.aIConversation.create({
    data: {
      id: ids.conversation,
      organizationId: ids.org,
      userId: ids.userPriya,
      contextType: "SELF_SERVICE",
      status: "ACTIVE",
      messages: {
        create: {
          role: "user",
          content: "When do I work this weekend?"
        }
      }
    }
  }).catch(() => undefined);

  await prisma.aIToolCall.create({
    data: {
      id: ids.toolCall,
      conversationId: ids.conversation,
      userId: ids.userPriya,
      toolName: "get_my_schedule",
      inputJson: { employeeId: ids.empPriya, dateRange: "this_weekend" },
      outputJson: { shiftIds: [ids.shiftPriyaFriday] },
      status: "EXECUTED",
      riskLevel: "READ_ONLY"
    }
  }).catch(() => undefined);

  await prisma.auditLog.create({
    data: {
      id: ids.auditSeed,
      organizationId: ids.org,
      actorType: "SYSTEM",
      action: "seed.demo_dataset",
      objectType: "Organization",
      objectId: ids.org,
      after: { seeded: true, scenario: "mvp_shift_swap" },
      reason: "Create repeatable MVP demo dataset"
    }
  }).catch(() => undefined);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
