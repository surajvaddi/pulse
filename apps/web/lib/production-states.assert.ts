import assert from "node:assert/strict";

import { productionStateFor } from "@/lib/production-states";

assert.equal(productionStateFor("loading").title, "Preparing workspace");
assert.equal(productionStateFor("forbidden").eyebrow, "Forbidden");
assert.equal(
  productionStateFor("error", { message: "API offline" }).message,
  "API offline"
);
assert.ok(productionStateFor("empty").message.includes("role"));
