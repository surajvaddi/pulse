import { strict as assert } from "node:assert";

import {
  appRoutes,
  assertPageContractsComplete,
  pageContracts,
  routeAllowedForRole
} from "./page-contracts";

assert.equal(assertPageContractsComplete(), true);
assert.equal(Object.keys(pageContracts).length, appRoutes.length);
assert.equal(routeAllowedForRole("/app/admin/users", "EMPLOYEE"), false);
assert.equal(routeAllowedForRole("/app/admin/users", "SYSTEM_ADMIN"), true);
assert.equal(pageContracts["/app/admin/roles"].hiddenActions.includes("raw_permission_entry"), true);
