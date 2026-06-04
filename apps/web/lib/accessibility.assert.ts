import assert from "node:assert/strict";

import { appRoutes, pageContracts } from "@/lib/page-contracts";
import { defaultLandingRoute } from "@/lib/landing-route";
import { navigationForSession, primaryMobileNavigation } from "@/lib/navigation";

for (const route of appRoutes) {
  const label = pageContracts[route].label;
  assert.ok(label.length > 0 && label.length <= 24, `${route} needs a concise nav label`);
}

const adminSession = {
  role: "SYSTEM_ADMIN",
  permissions: ["integration:manage", "user:manage", "audit:read", "ai:admin", "ai:use"]
};
const managerSession = {
  role: "UNIT_MANAGER",
  permissions: ["schedule:read:unit", "shift:swap:approve", "timecard:read:unit", "ai:use"]
};

assert.equal(defaultLandingRoute(adminSession), "/app/admin");
assert.equal(defaultLandingRoute(managerSession), "/app/manager");
assert.ok(primaryMobileNavigation(navigationForSession(adminSession)).length <= 5);
assert.ok(primaryMobileNavigation(navigationForSession(managerSession)).length <= 5);
assert.ok(navigationForSession(managerSession).every((item) => item.label.trim() === item.label));
