import assert from "node:assert/strict";

import {
  accessTokenCookieOptions,
  demoUserCookieOptions,
  sessionCookieNames,
  serializeClearSessionCookie
} from "@pulseshift/tools";

const demoCookie = demoUserCookieOptions({ NODE_ENV: "development" });
assert.equal(sessionCookieNames.demoUserId, "ps_demo_user_id");
assert.equal(demoCookie.httpOnly, true);
assert.equal(demoCookie.secure, false);
assert.equal(demoCookie.maxAge, 60 * 60 * 8);

const accessCookie = accessTokenCookieOptions({ NODE_ENV: "production" });
assert.equal(sessionCookieNames.accessToken, "ps_access_token");
assert.equal(accessCookie.secure, true);
assert.equal(accessCookie.maxAge, 60 * 60);

const clearedAccessCookie = serializeClearSessionCookie(sessionCookieNames.accessToken, { NODE_ENV: "production" });
assert.equal(clearedAccessCookie.name, sessionCookieNames.accessToken);
assert.ok(clearedAccessCookie.header.includes("Expires=Thu, 01 Jan 1970 00:00:00 GMT"));
assert.ok(clearedAccessCookie.header.includes("Secure"));
