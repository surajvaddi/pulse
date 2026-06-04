import assert from "node:assert/strict";

import { navigationForSession, primaryMobileNavigation, sessionCanOpenRoute } from "@/lib/navigation";

const employee = {
  role: "EMPLOYEE",
  permissions: [
    "schedule:read:self",
    "shift:claim",
    "shift:swap:create",
    "timecard:read:self",
    "ai:use"
  ]
};

const manager = {
  role: "UNIT_MANAGER",
  permissions: ["schedule:read:unit", "shift:swap:approve", "timecard:read:unit", "ai:use"]
};

const payroll = {
  role: "PAYROLL_ADMIN",
  permissions: ["timecard:read:unit", "timecard:resolve", "payroll:export", "ai:use"]
};

const admin = {
  role: "SYSTEM_ADMIN",
  permissions: ["integration:manage", "user:manage", "audit:read", "ai:admin", "ai:use"]
};

const employeeRoutes = navigationForSession(employee).map((item) => item.href);
assert.ok(employeeRoutes.includes("/app/schedule"));
assert.ok(employeeRoutes.includes("/app/open-shifts"));
assert.ok(!employeeRoutes.some((route) => route.startsWith("/app/admin")));

const managerRoutes = navigationForSession(manager).map((item) => item.href);
assert.ok(managerRoutes.includes("/app/manager"));
assert.ok(managerRoutes.includes("/app/staffing-gaps"));
assert.ok(managerRoutes.includes("/app/timecards"));
assert.ok(!managerRoutes.includes("/app/admin/users"));

const payrollRoutes = navigationForSession(payroll).map((item) => item.href);
assert.deepEqual(payrollRoutes.filter((route) => route === "/app/timecards"), ["/app/timecards"]);
assert.ok(!payrollRoutes.includes("/app/manager"));

const adminRoutes = navigationForSession(admin).map((item) => item.href);
assert.ok(adminRoutes.includes("/app/admin"));
assert.ok(adminRoutes.includes("/app/admin/users"));
assert.ok(adminRoutes.includes("/app/admin/evals"));
assert.ok(!adminRoutes.includes("/app/open-shifts"));

assert.equal(sessionCanOpenRoute(manager, "/app/schedule"), true);
assert.equal(sessionCanOpenRoute(employee, "/app/admin/users"), false);
assert.ok(primaryMobileNavigation(navigationForSession(admin)).length <= 5);
