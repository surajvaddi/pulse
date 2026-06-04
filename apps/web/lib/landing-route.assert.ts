import assert from "node:assert/strict";

import { defaultLandingRoute } from "@/lib/landing-route";

assert.equal(
  defaultLandingRoute({
    role: "EMPLOYEE",
    permissions: ["schedule:read:self", "shift:claim", "shift:swap:create", "timecard:read:self", "ai:use"]
  }),
  "/app/home"
);

assert.equal(
  defaultLandingRoute({
    role: "UNIT_MANAGER",
    permissions: ["schedule:read:unit", "shift:swap:approve", "timecard:read:unit", "ai:use"]
  }),
  "/app/manager"
);

assert.equal(
  defaultLandingRoute({
    role: "PAYROLL_ADMIN",
    permissions: ["timecard:read:unit", "timecard:resolve", "payroll:export", "ai:use"]
  }),
  "/app/timecards"
);

assert.equal(
  defaultLandingRoute({
    role: "SYSTEM_ADMIN",
    permissions: ["integration:manage", "user:manage", "audit:read", "ai:admin", "ai:use"]
  }),
  "/app/admin/users"
);

assert.equal(defaultLandingRoute({ role: "UNKNOWN", permissions: [] }), "/app/home");
