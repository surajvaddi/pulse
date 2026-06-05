import assert from "node:assert/strict";

import {
  accessTokenCookieOptions,
  clearSessionCookieHeaders,
  demoUserCookieOptions,
  sessionCookieNames
} from "@pulseshift/tools";

const localAccessCookie = accessTokenCookieOptions({ NODE_ENV: "development" });
assert.equal(localAccessCookie.httpOnly, true);
assert.equal(localAccessCookie.sameSite, "lax");
assert.equal(localAccessCookie.secure, false);
assert.equal(localAccessCookie.path, "/");
assert.equal(localAccessCookie.maxAge, 60 * 60);

const productionAccessCookie = accessTokenCookieOptions({ NODE_ENV: "production" });
assert.equal(productionAccessCookie.secure, true);

const stagingDemoCookie = demoUserCookieOptions({ APP_ENV: "staging", SESSION_COOKIE_SECURE: "true" });
assert.equal(stagingDemoCookie.secure, true);
assert.equal(stagingDemoCookie.maxAge, 60 * 60 * 8);

assert.throws(
  () => accessTokenCookieOptions({ APP_ENV: "production", SESSION_COOKIE_SECURE: "false" }),
  /Production session cookies must be secure/
);

const clearHeaders = clearSessionCookieHeaders({ NODE_ENV: "production" });
assert.equal(clearHeaders.length, 2);
assert.ok(clearHeaders.some((header) => header.startsWith(`${sessionCookieNames.accessToken}=`)));
assert.ok(clearHeaders.some((header) => header.startsWith(`${sessionCookieNames.demoUserId}=`)));
assert.ok(clearHeaders.every((header) => header.includes("HttpOnly")));
assert.ok(clearHeaders.every((header) => header.includes("SameSite=Lax")));
assert.ok(clearHeaders.every((header) => header.includes("Max-Age=0")));
assert.ok(clearHeaders.every((header) => header.includes("Secure")));
