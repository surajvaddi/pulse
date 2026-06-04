import assert from "node:assert/strict";

import { defaultLandingRoute } from "@/lib/landing-route";
import { navigationForSession, primaryMobileNavigation } from "@/lib/navigation";

const roleWalkthroughs = [
  { role: "ORGANIZATION_OWNER", permissions: ["audit:read", "integration:manage", "user:manage", "ai:admin", "ai:use"] },
  { role: "SYSTEM_ADMIN", permissions: ["audit:read", "integration:manage", "user:manage", "ai:admin", "ai:use"] },
  { role: "WORKFORCE_ADMIN", permissions: ["schedule:read:facility", "schedule:write:draft", "shift:assign", "notification:send:facility", "ai:use"] },
  { role: "UNIT_MANAGER", permissions: ["schedule:read:unit", "shift:swap:approve", "shift:assign", "timecard:read:unit", "ai:use"] },
  { role: "CHARGE_NURSE", permissions: ["schedule:read:unit", "notification:send:unit", "ai:use"] },
  { role: "EMPLOYEE", permissions: ["schedule:read:self", "shift:claim", "shift:swap:create", "timecard:read:self", "timecard:write:self", "ai:use"] },
  { role: "FLOAT_POOL_COORDINATOR", permissions: ["schedule:read:facility", "shift:assign", "availability:read:unit", "credential:read", "ai:use"] },
  { role: "PAYROLL_ADMIN", permissions: ["timecard:read:unit", "timecard:resolve", "payroll:export", "ai:use"] },
  { role: "CREDENTIALING_ADMIN", permissions: ["credential:read", "credential:write", "ai:use"] },
  { role: "COMPLIANCE_AUDITOR", permissions: ["audit:read", "ai:use"] },
  { role: "EXECUTIVE_VIEWER", permissions: ["schedule:read:facility", "ai:use"] },
  { role: "EXTERNAL_AGENCY_ADMIN", permissions: ["schedule:read:self", "shift:claim", "ai:use"] },
  { role: "AI_AGENT_SERVICE", permissions: ["ai:use"] }
];

for (const session of roleWalkthroughs) {
  const landingRoute = defaultLandingRoute(session);
  const navigation = navigationForSession(session);
  assert.ok(navigation.length > 0, `${session.role} needs visible navigation`);
  assert.ok(navigation.some((item) => item.href === landingRoute), `${session.role} landing must be navigable`);
  assert.ok(primaryMobileNavigation(navigation).length > 0, `${session.role} needs mobile navigation`);
}
