import assert from "node:assert/strict";

import { ApiRequestError, apiRequestErrorFor } from "./api";

const cases = [
  [401, "LOGIN_REQUIRED"],
  [403, "PERMISSION_DENIED"],
  [404, "NOT_FOUND"],
  [409, "WORKFLOW_CONFLICT"],
  [500, "RETRYABLE"],
  [422, "REQUEST_FAILED"]
] as const;

for (const [status, category] of cases) {
  const error = apiRequestErrorFor(status, "req_test");
  assert.ok(error instanceof ApiRequestError);
  assert.equal(error.category, category);
  assert.equal(error.requestId, "req_test");
  assert.equal(error.message.includes("Internal"), false);
}
