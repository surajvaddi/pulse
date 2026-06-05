import assert from "node:assert/strict";

import { InMemoryNotificationRepository } from "./notification.repository";

async function main() {
  const repository = new InMemoryNotificationRepository();

  const created = await repository.createNotification({
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_priya",
    channel: "IN_APP",
    type: "SHIFT_UPDATED",
    category: "SCHEDULE",
    priority: "HIGH",
    payload: { shiftId: "shift_priya_friday_icu_night" }
  });

  assert.equal(created.organizationId, "org_pulseshift_demo");
  assert.equal(created.status, "QUEUED");
  assert.equal(created.category, "SCHEDULE");
  assert.equal(created.priority, "HIGH");
  assert.equal(created.retryCount, 0);

  const unreadBefore = await repository.countUnread({
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_priya"
  });
  assert.ok(unreadBefore >= 1);

  const otherTenantList = await repository.listNotifications({
    organizationId: "org_other",
    recipientUserId: "user_priya"
  });
  assert.equal(otherTenantList.length, 0);

  const otherRecipientList = await repository.listNotifications({
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_maya"
  });
  assert.equal(
    otherRecipientList.some((notification) => notification.id === created.id),
    false
  );

  const delivered = await repository.updateDeliveryStatus({
    organizationId: "org_pulseshift_demo",
    notificationId: created.id,
    recipientUserId: "user_priya",
    status: "DELIVERED",
    providerMessageId: "provider-message-1",
    providerMetadata: { provider: "assertion" }
  });
  assert.equal(delivered.status, "DELIVERED");
  assert.equal(delivered.providerMessageId, "provider-message-1");
  assert.ok(delivered.deliveredAt);

  const read = await repository.markRead({
    organizationId: "org_pulseshift_demo",
    notificationId: created.id,
    recipientUserId: "user_priya"
  });
  assert.equal(read.status, "READ");
  assert.ok(read.readAt);

  const unreadAfter = await repository.countUnread({
    organizationId: "org_pulseshift_demo",
    recipientUserId: "user_priya"
  });
  assert.equal(unreadAfter, unreadBefore - 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
