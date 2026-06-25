import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/app/copilot/page.tsx", "utf8");
const actions = readFileSync("app/app/actions.ts", "utf8");

assert.ok(page.includes("const response = lastPrompt"));
assert.ok(page.includes("response ?"));
assert.ok(page.includes('name="message" value={prompt}'));
assert.ok(page.includes("choose a suggestion to begin"));
assert.equal(page.includes(': "When do I work next?"'), false);
assert.ok(actions.includes("redirect(`/app/copilot?last=${encoded}`)"));
assert.equal(actions.includes('apiPost("/copilot/messages"'), false);
