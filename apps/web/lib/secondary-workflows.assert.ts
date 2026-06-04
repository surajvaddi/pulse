import assert from "node:assert/strict";

import { sessionCanOpenRoute } from "@/lib/navigation";

assert.equal(
  sessionCanOpenRoute(
    { role: "CREDENTIALING_ADMIN", permissions: ["credential:read", "credential:write", "ai:use"] },
    "/app/admin/credentials"
  ),
  true
);
assert.equal(
  sessionCanOpenRoute({ role: "COMPLIANCE_AUDITOR", permissions: ["audit:read", "ai:use"] }, "/app/admin/audit"),
  true
);
assert.equal(
  sessionCanOpenRoute({ role: "PAYROLL_ADMIN", permissions: ["timecard:read:unit", "timecard:resolve", "ai:use"] }, "/app/timecards"),
  true
);
assert.equal(
  sessionCanOpenRoute({ role: "EXECUTIVE_VIEWER", permissions: ["schedule:read:facility", "ai:use"] }, "/app/schedule"),
  true
);
