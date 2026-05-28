export const demoEmployeeByUserId = new Map<string, string>([
  ["user_priya", "emp_priya"],
  ["user_maya", "emp_maya"]
]);

export const demoSchedules = [
  {
    id: "shift_priya_friday_icu_night",
    employeeId: "emp_priya",
    userId: "user_priya",
    unitId: "unit_icu",
    facilityId: "fac_mercy_main",
    title: "ICU RN Night",
    startsAt: "2026-05-29T23:00:00.000Z",
    endsAt: "2026-05-30T11:00:00.000Z",
    status: "PUBLISHED"
  },
  {
    id: "shift_maya_saturday_icu_day",
    employeeId: "emp_maya",
    userId: "user_maya",
    unitId: "unit_icu",
    facilityId: "fac_mercy_main",
    title: "ICU RN Day",
    startsAt: "2026-05-30T12:00:00.000Z",
    endsAt: "2026-05-31T00:00:00.000Z",
    status: "PUBLISHED"
  },
  {
    id: "shift_open_icu_night",
    unitId: "unit_icu",
    facilityId: "fac_mercy_main",
    title: "ICU RN Night Open",
    startsAt: "2026-05-31T23:00:00.000Z",
    endsAt: "2026-06-01T11:00:00.000Z",
    status: "OPEN"
  }
];

export const demoTimecardExceptions = [
  {
    id: "timecard_exception_late_priya",
    employeeId: "emp_priya",
    userId: "user_priya",
    unitId: "unit_icu",
    type: "LATE_CLOCK_IN",
    severity: "MEDIUM",
    status: "OPEN",
    explanation: "Priya clocked in 17 minutes after the scheduled ICU night shift start."
  }
];

export const demoAuditLogs = [
  {
    id: "audit_seed_demo",
    organizationId: "org_pulseshift_demo",
    actorType: "SYSTEM",
    action: "seed.demo_dataset",
    objectType: "Organization",
    objectId: "org_pulseshift_demo",
    createdAt: "2026-05-27T00:00:00.000Z"
  }
];

