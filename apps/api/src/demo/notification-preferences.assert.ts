import assert from "node:assert/strict";

import {
  AccountRoleSchema,
  NotificationPreferenceSchema,
  RoleNotificationPreferenceDefaults
} from "@pulseshift/domain";

for (const role of AccountRoleSchema.options) {
  const defaults = RoleNotificationPreferenceDefaults[role];
  assert.ok(defaults.length >= 1, `${role} must define at least one notification default`);

  const uniqueKeys = new Set<string>();
  for (const preference of defaults) {
    const parsed = NotificationPreferenceSchema.parse({
      ...preference,
      userId: "assertion-user"
    });
    assert.equal(parsed.role, role);

    const key = `${parsed.category}:${parsed.channel}`;
    assert.ok(!uniqueKeys.has(key), `${role} has duplicate notification default ${key}`);
    uniqueKeys.add(key);
  }

  assert.ok(
    defaults.some((preference) => preference.channel === "IN_APP"),
    `${role} must have an in-app notification default`
  );
}

assert.equal(
  RoleNotificationPreferenceDefaults.AI_AGENT_SERVICE.every((preference) => preference.required),
  true,
  "AI service identity defaults must remain required and backend controlled"
);
