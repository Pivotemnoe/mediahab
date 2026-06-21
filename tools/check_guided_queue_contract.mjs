import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const require = createRequire(import.meta.url);
const typescript = require("../apps/web/node_modules/typescript");

const sourcePath = new URL("../apps/web/src/services/guided-queue-contract.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const transpiled = typescript.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: typescript.ModuleKind.CommonJS,
    target: typescript.ScriptTarget.ES2022,
  },
  fileName: "guided-queue-contract.ts",
});

const moduleScope = {
  exports: {},
  module: { exports: {} },
};
moduleScope.exports = moduleScope.module.exports;

new Script(transpiled.outputText, { filename: "guided-queue-contract.cjs" }).runInNewContext(moduleScope);

const {
  createGuidedQueueJob,
  hasGuidedQueueValues,
  parseGuidedQueueJob,
  serializeGuidedQueueJob,
} = moduleScope.module.exports;

assert.equal(typeof createGuidedQueueJob, "function");
assert.equal(typeof parseGuidedQueueJob, "function");
assert.equal(typeof serializeGuidedQueueJob, "function");
assert.equal(typeof hasGuidedQueueValues, "function");

const job = createGuidedQueueJob({
  code: "api_unavailable",
  fieldTypes: {
    "field:name": "short_text",
    "field:price": "money",
    ignored: 42,
    value: "rating",
  },
  recoveryAction: "retry",
  requestId: "request-1",
  savedAt: "2026-06-21T00:00:00.000Z",
  values: {
    "field:name": "Уха",
    "field:price": "350 RUB",
    "field:tags": ["soup", "fish", 99, ""],
    ignored: 12,
    value: "7",
  },
});
assert.deepEqual(normalize(job), {
  code: "api_unavailable",
  fieldTypes: {
    "field:name": "short_text",
    "field:price": "money",
    value: "rating",
  },
  recoveryAction: "retry",
  requestId: "request-1",
  savedAt: "2026-06-21T00:00:00.000Z",
  values: {
    "field:name": "Уха",
    "field:price": "350 RUB",
    "field:tags": ["soup", "fish", ""],
    value: "7",
  },
});

assert.deepEqual(normalize(parseGuidedQueueJob(serializeGuidedQueueJob(job))), normalize(job));

const legacyJob = parseGuidedQueueJob(JSON.stringify({
  code: "version_conflict",
  recoveryAction: "refresh",
  requestId: "request-2",
  savedAt: "2026-06-21T00:00:00.000Z",
  values: { value: "draft" },
}));
assert.deepEqual(normalize(legacyJob), {
  code: "version_conflict",
  fieldTypes: {},
  recoveryAction: "refresh",
  requestId: "request-2",
  savedAt: "2026-06-21T00:00:00.000Z",
  values: { value: "draft" },
});

const invalidFieldTypesJob = parseGuidedQueueJob(JSON.stringify({
  fieldTypes: ["money"],
  recoveryAction: "retry",
  values: { value: "590" },
}));
assert.deepEqual(normalize(invalidFieldTypesJob).fieldTypes, {});

assert.equal(hasGuidedQueueValues({ value: "" }), false);
assert.equal(hasGuidedQueueValues({ value: "  " }), false);
assert.equal(hasGuidedQueueValues({ "field:tags": [] }), false);
assert.equal(hasGuidedQueueValues({ "field:tags": ["", "  "] }), false);
assert.equal(hasGuidedQueueValues({ "field:tags": ["", "terrace"] }), true);
assert.equal(hasGuidedQueueValues({ "field:price": "350 RUB" }), true);
assert.equal(hasGuidedQueueValues({}), false);

assert.equal(parseGuidedQueueJob(null), null);
assert.equal(parseGuidedQueueJob("{not json"), null);
assert.equal(parseGuidedQueueJob(JSON.stringify({ fieldTypes: { value: "money" } })), null);

console.log("guided queue contract checks passed");

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}
