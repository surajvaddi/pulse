import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/auth/invitation.service.ts", "utf8");
const controller = readFileSync("src/auth/invitation.controller.ts", "utf8");
const organizationPage = readFileSync(
  "../../apps/web/app/onboarding/organization/page.tsx",
  "utf8"
);

assert.ok(service.includes("acceptanceHandleFor"));
assert.ok(service.includes("timingSafeEqual"));
assert.ok(service.includes("email: claims.email.toLowerCase()"));
assert.ok(service.includes('status: "PENDING"'));
assert.ok(service.includes("expiresAt: { gt: new Date() }"));
assert.ok(service.includes("updateMany"));
assert.ok(service.includes("claimed.count !== 1"));
assert.ok(controller.includes(
  '@Post("invitations/pending/:invitationId/accept")'
));
assert.ok(organizationPage.includes("Join workspace"));
