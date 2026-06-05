import assert from "node:assert/strict";

import {
  demoAuthEnabledForEnv,
  demoResetEnabledForEnv,
  demoSeedShortcutsEnabledForEnv
} from "@/lib/demo-controls";
import { productionStateFor } from "@/lib/production-states";

assert.equal(productionStateFor("loading").title, "Preparing workspace");
assert.equal(productionStateFor("forbidden").eyebrow, "Forbidden");
assert.equal(
  productionStateFor("error", { message: "API offline" }).message,
  "API offline"
);
assert.ok(productionStateFor("empty").message.includes("role"));

assert.equal(demoAuthEnabledForEnv({ APP_ENV: "production", ENABLE_DEMO_AUTH: "true" }), false);
assert.equal(demoAuthEnabledForEnv({ NODE_ENV: "production", ENABLE_DEMO_AUTH: "true" }), false);
assert.equal(demoAuthEnabledForEnv({ APP_ENV: "staging", ENABLE_DEMO_AUTH: "false" }), false);
assert.equal(demoAuthEnabledForEnv({ APP_ENV: "local", ENABLE_DEMO_AUTH: "true" }), true);

assert.equal(demoResetEnabledForEnv({ APP_ENV: "production", ENABLE_DEMO_RESET: "true" }), false);
assert.equal(demoResetEnabledForEnv({ NODE_ENV: "production", ENABLE_DEMO_RESET: "true" }), false);
assert.equal(demoResetEnabledForEnv({ APP_ENV: "staging", ENABLE_DEMO_RESET: "false" }), false);
assert.equal(demoResetEnabledForEnv({ APP_ENV: "local", ENABLE_DEMO_RESET: "true" }), true);

assert.equal(
  demoSeedShortcutsEnabledForEnv({
    APP_ENV: "production",
    ENABLE_DEMO_AUTH: "true",
    ENABLE_DEMO_SEED_SHORTCUTS: "true"
  }),
  false
);
