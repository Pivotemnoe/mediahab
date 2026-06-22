import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const require = createRequire(import.meta.url);
const typescript = require("../apps/web/node_modules/typescript");

const queueContractModule = await loadServiceModule("guided-queue-contract.ts", {
  require(specifier) {
    if (specifier === "@/services/guided-action-state") {
      return {};
    }
    throw new Error(`Unexpected require: ${specifier}`);
  },
});
const moduleScope = await loadServiceModule("guided-queue-store.ts", {
  require(specifier) {
    if (specifier === "@/services/guided-queue-contract") {
      return queueContractModule;
    }
    throw new Error(`Unexpected require: ${specifier}`);
  },
});

const { summarizeGuidedQueueEntries } = moduleScope;

assert.equal(typeof summarizeGuidedQueueEntries, "function");
assert.deepEqual(normalize(summarizeGuidedQueueEntries([])), {
  blockedJobCount: 0,
  fieldJobCount: 0,
  jobCount: 0,
  repeatableGroupJobCount: 0,
  retryableJobCount: 0,
  unknownJobCount: 0,
});

const mixedSummary = summarizeGuidedQueueEntries([
  {
    job: {
      code: "api_unavailable",
      fieldTypes: { value: "voice_or_long_text" },
      metadata: {
        blockId: null,
        contentId: "content-field",
        fieldKey: "summary",
        intent: "save",
        itemVersion: 1,
        kind: "field",
        sourceType: "user_text",
      },
      recoveryAction: "retry",
      requestId: "field-request",
      savedAt: "2026-06-22T00:00:00.000Z",
      values: { value: "Черновик с приватной деталью" },
    },
    storageKey: "tmh:guided-form-queue:v1:field:content-field:summary:new",
  },
  {
    job: {
      code: "api_unavailable",
      fieldTypes: { "field:name": "short_text" },
      metadata: {
        contentId: "content-repeatable",
        groupKey: "dishes",
        intent: "lock",
        itemVersion: 2,
        kind: "repeatable_group",
        sourceType: "user_text",
      },
      recoveryAction: "retry",
      requestId: "repeatable-request",
      savedAt: "2026-06-22T00:00:00.000Z",
      values: { "field:name": "secret dish" },
    },
    storageKey: "tmh:guided-form-queue:v1:repeatable:content-repeatable:dishes:new",
  },
  {
    job: {
      code: "version_conflict",
      fieldTypes: { value: "voice_or_long_text" },
      metadata: null,
      recoveryAction: "refresh",
      requestId: "legacy-request",
      savedAt: "2026-06-22T00:00:00.000Z",
      values: { value: "legacy secret" },
    },
    storageKey: "tmh:guided-form-queue:v1:field:legacy:value:new",
  },
  {
    job: {
      code: null,
      fieldTypes: {},
      metadata: null,
      recoveryAction: "none",
      requestId: null,
      savedAt: "2026-06-22T00:00:00.000Z",
      values: { value: "unclassified draft" },
    },
    storageKey: "tmh:guided-form-queue:v1:field:unknown:value:new",
  },
]);

assert.deepEqual(normalize(mixedSummary), {
  blockedJobCount: 1,
  fieldJobCount: 1,
  jobCount: 4,
  repeatableGroupJobCount: 1,
  retryableJobCount: 2,
  unknownJobCount: 2,
});

const serializedSummary = JSON.stringify(mixedSummary);
for (const privateValue of ["Черновик", "secret", "legacy", "unclassified"]) {
  assert.equal(
    serializedSummary.includes(privateValue),
    false,
    `queue summary must not expose queued value: ${privateValue}`,
  );
}

console.log("guided queue store summary checks passed");

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadServiceModule(fileName, overrides = {}) {
  const sourcePath = new URL(`../apps/web/src/services/${fileName}`, import.meta.url);
  const source = await readFile(sourcePath, "utf8");
  const transpiled = typescript.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName,
  });

  const moduleScope = {
    exports: {},
    module: { exports: {} },
    ...overrides,
  };
  moduleScope.exports = moduleScope.module.exports;

  new Script(transpiled.outputText, { filename: fileName.replace(/\.ts$/, ".cjs") }).runInNewContext(moduleScope);
  return moduleScope.module.exports;
}
