import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildAdminDashboard } from "@/lib/admin-dashboard";

const adminPage = readFileSync("app/app/admin/page.tsx", "utf8");
assert.ok(adminPage.includes("Promise.allSettled"));
assert.ok(adminPage.includes("Some admin data is unavailable"));
assert.ok(adminPage.includes("Available sections remain usable"));

const dashboard = buildAdminDashboard({
  users: [
    {
      id: "user_1",
      organizationId: "org_1",
      email: "active@example.com",
      displayName: "Active User",
      status: "ACTIVE",
      roles: ["EMPLOYEE"]
    },
    {
      id: "user_2",
      organizationId: "org_1",
      email: "suspended@example.com",
      displayName: "Suspended User",
      status: "SUSPENDED",
      roles: ["EMPLOYEE"]
    }
  ],
  facilities: [
    {
      id: "facility_1",
      organizationId: "org_1",
      name: "Main",
      timezone: "America/New_York",
      status: "ACTIVE"
    }
  ],
  units: [{ id: "unit_1", facilityId: "facility_1", name: "ICU", type: "ICU", managerUserIds: [], active: true }],
  invitations: [
    {
      id: "invite_1",
      organizationId: "org_1",
      email: "pending@example.com",
      role: "EMPLOYEE",
      scope: { type: "SELF" },
      status: "PENDING",
      invitedByUserId: "user_admin"
    }
  ],
  integrations: [
    {
      id: "integration_1",
      system: "HRIS",
      displayName: "HRIS",
      status: "DISCONNECTED",
      direction: "IMPORT",
      lastSyncAt: null,
      nextSyncAt: null,
      recordTypes: ["EMPLOYEE"]
    }
  ],
  auditLogs: [
    {
      id: "audit_1",
      actorType: "USER",
      action: "admin.first",
      objectType: "User",
      objectId: "user_1",
      createdAt: "2026-06-01T00:00:00.000Z"
    },
    {
      id: "audit_2",
      actorType: "USER",
      action: "admin.second",
      objectType: "User",
      objectId: "user_2",
      createdAt: "2026-06-02T00:00:00.000Z"
    }
  ]
});

assert.equal(dashboard.suspendedUsers.length, 1);
assert.equal(dashboard.pendingInvitations.length, 1);
assert.equal(dashboard.inactiveIntegrations.length, 1);
assert.equal(dashboard.cards.at(0)?.tone, "attention");
assert.equal(dashboard.cards.at(2)?.value, "1");
assert.equal(dashboard.recentAuditLogs.at(0)?.id, "audit_2");
