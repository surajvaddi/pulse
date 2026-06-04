import assert from "node:assert/strict";

import { defaultLandingRoute } from "@/lib/landing-route";

const permissions = {
  employee: ["schedule:read:self", "shift:claim", "shift:swap:create", "timecard:read:self", "ai:use"],
  manager: ["schedule:read:unit", "shift:swap:approve", "timecard:read:unit", "ai:use"],
  payroll: ["timecard:read:unit", "timecard:resolve", "payroll:export", "ai:use"],
  admin: ["integration:manage", "user:manage", "audit:read", "ai:admin", "ai:use"],
  workforce: ["schedule:read:facility", "schedule:write:draft", "shift:assign", "ai:use"],
  credentialing: ["credential:read", "credential:write", "ai:use"],
  auditor: ["audit:read", "ai:use"],
  executive: ["schedule:read:facility", "ai:use"],
  ai: ["ai:use"]
};

assert.equal(
  defaultLandingRoute({
    role: "EMPLOYEE",
    permissions: permissions.employee
  }),
  "/app/home"
);

assert.equal(
  defaultLandingRoute({
    role: "UNIT_MANAGER",
    permissions: permissions.manager
  }),
  "/app/manager"
);

assert.equal(
  defaultLandingRoute({
    role: "PAYROLL_ADMIN",
    permissions: permissions.payroll
  }),
  "/app/timecards"
);

assert.equal(
  defaultLandingRoute({
    role: "SYSTEM_ADMIN",
    permissions: permissions.admin
  }),
  "/app/admin"
);

assert.equal(defaultLandingRoute({ role: "EXTERNAL_AGENCY_ADMIN", permissions: permissions.employee }), "/app/home");
assert.equal(defaultLandingRoute({ role: "CHARGE_NURSE", permissions: permissions.manager }), "/app/home");
assert.equal(defaultLandingRoute({ role: "FLOAT_POOL_COORDINATOR", permissions: permissions.workforce }), "/app/home");
assert.equal(defaultLandingRoute({ role: "WORKFORCE_ADMIN", permissions: permissions.workforce }), "/app/home");
assert.equal(defaultLandingRoute({ role: "CREDENTIALING_ADMIN", permissions: permissions.credentialing }), "/app/admin/credentials");
assert.equal(defaultLandingRoute({ role: "COMPLIANCE_AUDITOR", permissions: permissions.auditor }), "/app/admin/audit");
assert.equal(defaultLandingRoute({ role: "EXECUTIVE_VIEWER", permissions: permissions.executive }), "/app/home");
assert.equal(defaultLandingRoute({ role: "ORGANIZATION_OWNER", permissions: permissions.admin }), "/app/admin");
assert.equal(defaultLandingRoute({ role: "AI_AGENT_SERVICE", permissions: permissions.ai }), "/app/copilot");
assert.equal(defaultLandingRoute({ role: "UNKNOWN", permissions: [] }), "/app/home");
