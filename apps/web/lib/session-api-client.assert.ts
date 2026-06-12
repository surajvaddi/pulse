import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const apiClient = readFileSync("lib/api.ts", "utf8");

assert.ok(apiClient.includes("apiGetSession"));
assert.ok(apiClient.includes("apiPostSession"));
assert.ok(apiClient.includes("apiPatchSession"));
assert.ok(apiClient.includes("readSupabaseAccessToken"));
