import assert from "node:assert/strict";

import { buildRoleDashboard } from "@/lib/role-dashboard";
import { sessionCanOpenRoute } from "@/lib/navigation";

const rolePermissions = {
  UNIT_MANAGER: ["schedule:read:unit", "shift:swap:approve", "timecard:read:unit", "ai:use"],
  CHARGE_NURSE: ["schedule:read:unit", "notification:send:unit", "ai:use"],
  FLOAT_POOL_COORDINATOR: ["schedule:read:facility", "shift:assign", "availability:read:unit", "credential:read", "ai:use"],
  WORKFORCE_ADMIN: ["schedule:read:facility", "schedule:write:draft", "shift:assign", "notification:send:facility", "ai:use"],
  PAYROLL_ADMIN: ["timecard:read:unit", "timecard:resolve", "payroll:export", "ai:use"],
  CREDENTIALING_ADMIN: ["credential:read", "credential:write", "ai:use"],
  COMPLIANCE_AUDITOR: ["audit:read", "ai:use"],
  EXECUTIVE_VIEWER: ["schedule:read:facility", "ai:use"],
  ORGANIZATION_OWNER: ["audit:read", "integration:manage", "user:manage", "ai:admin", "ai:use"],
  SYSTEM_ADMIN: ["audit:read", "integration:manage", "user:manage", "ai:admin", "ai:use"]
};

for (const [role, permissions] of Object.entries(rolePermissions)) {
  const dashboard = buildRoleDashboard(role);
  assert.ok(dashboard.title.length > 0, `${role} needs a dashboard title`);
  assert.ok(dashboard.summary.length > 0, `${role} needs a dashboard summary`);
  assert.equal(dashboard.cards.length, 3, `${role} needs three demo actions`);
  assert.ok(dashboard.cards.every((card) => card.href.startsWith("/app/")));
  const inaccessibleCards = dashboard.cards.filter(
    (card) => !sessionCanOpenRoute({ role, permissions }, card.href)
  );
  assert.deepEqual(
    inaccessibleCards.map((card) => card.href),
    [],
    `${role} has inaccessible dashboard links`
  );
}
