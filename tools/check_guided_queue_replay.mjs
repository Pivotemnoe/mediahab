import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const require = createRequire(import.meta.url);
const typescript = require("../apps/web/node_modules/typescript");

const actionValuesModule = await loadServiceModule("guided-action-values.ts");
const moduleScope = await loadServiceModule("guided-queue-replay.ts", {
  require(specifier) {
    if (specifier === "@/services/guided-action-values") {
      return actionValuesModule;
    }
    throw new Error(`Unexpected require: ${specifier}`);
  },
});

const {
  buildGuidedQueueReplayDraft,
  buildGuidedQueueReplayRequestDraft,
  getGuidedQueueReplayReadiness,
} = moduleScope;

function queueEntries(count) {
  return Array.from({ length: count }, (_, index) => ({
    job: {
      code: null,
      fieldTypes: { value: "voice_or_long_text" },
      recoveryAction: "retry",
      requestId: null,
      savedAt: "2026-06-21T00:00:00.000Z",
      values: { value: `draft ${index + 1}` },
    },
    storageKey: `tmh:guided-form-queue:v1:field:demo:${index + 1}:new`,
  }));
}

assert.equal(typeof getGuidedQueueReplayReadiness, "function");
assert.equal(typeof buildGuidedQueueReplayDraft, "function");
assert.equal(typeof buildGuidedQueueReplayRequestDraft, "function");

assert.deepEqual(normalize(getGuidedQueueReplayReadiness({ entries: [], online: true })), {
  canAutoReplay: false,
  jobCount: 0,
  reason: "no_queue_jobs",
  shellMessage: null,
  status: "empty",
});

assert.deepEqual(normalize(getGuidedQueueReplayReadiness({ entries: [], online: false })), {
  canAutoReplay: false,
  jobCount: 0,
  reason: "no_queue_jobs",
  shellMessage: "Нет сети: черновики сохраняются локально, ИИ и публикации недоступны.",
  status: "offline",
});

const onlineQueued = getGuidedQueueReplayReadiness({ entries: queueEntries(2), online: true });
assert.equal(onlineQueued.canAutoReplay, false);
assert.equal(onlineQueued.jobCount, 2);
assert.equal(onlineQueued.reason, "http_only_cookie_csrf_required");
assert.equal(onlineQueued.status, "manual_retry_required");
assert.match(onlineQueued.shellMessage, /Автоповтор выключен/);
assert.match(onlineQueued.shellMessage, /Есть несинхронизированные поля: 2\./);

assert.equal(
  getGuidedQueueReplayReadiness({ entries: queueEntries(1), online: false }).shellMessage,
  "Нет сети: 1 поле в локальной очереди, ИИ и публикации недоступны.",
);
assert.equal(
  getGuidedQueueReplayReadiness({ entries: queueEntries(2), online: false }).shellMessage,
  "Нет сети: 2 поля в локальной очереди, ИИ и публикации недоступны.",
);
assert.equal(
  getGuidedQueueReplayReadiness({ entries: queueEntries(5), online: false }).shellMessage,
  "Нет сети: 5 полей в локальной очереди, ИИ и публикации недоступны.",
);
assert.equal(
  getGuidedQueueReplayReadiness({ entries: queueEntries(11), online: false }).shellMessage,
  "Нет сети: 11 полей в локальной очереди, ИИ и публикации недоступны.",
);

const typedDraft = buildGuidedQueueReplayDraft({
  code: null,
  fieldTypes: {
    "field:available": "boolean",
    "field:price": "money",
    "field:rating": "rating",
    "field:tags": "multi_select",
    "field:type": "select",
    value: "voice_or_long_text",
  },
  recoveryAction: "retry",
  requestId: "req-1",
  savedAt: "2026-06-21T00:00:00.000Z",
  values: {
    "field:available": "true",
    "field:price": "590 ₽",
    "field:rating": "7,5",
    "field:tags": ["terrace", "kids_room", ""],
    "field:type": "family_dinner",
    value: "Тихо, быстро, без очереди.",
  },
});
assert.deepEqual(normalize(typedDraft), {
  fieldTypes: {
    "field:available": "boolean",
    "field:price": "money",
    "field:rating": "rating",
    "field:tags": "multi_select",
    "field:type": "select",
    value: "voice_or_long_text",
  },
  missingFieldTypes: [],
  typedValues: {
    "field:available": true,
    "field:price": { amount: 590, currency: "RUB" },
    "field:rating": 7.5,
    "field:tags": ["terrace", "kids_room"],
    "field:type": "family_dinner",
    value: { text: "Тихо, быстро, без очереди." },
  },
  valueCount: 6,
});

const legacyDraft = buildGuidedQueueReplayDraft({
  code: null,
  fieldTypes: {},
  recoveryAction: "retry",
  requestId: null,
  savedAt: "2026-06-21T00:00:00.000Z",
  values: {
    empty: "",
    value: "Старый локальный черновик",
  },
});
assert.deepEqual(normalize(legacyDraft), {
  fieldTypes: {},
  missingFieldTypes: ["value"],
  typedValues: {
    empty: { text: "" },
    value: { text: "Старый локальный черновик" },
  },
  valueCount: 2,
});

const existingBlockRequestDraft = buildGuidedQueueReplayRequestDraft({
  code: "api_unavailable",
  fieldTypes: { value: "money" },
  metadata: {
    blockId: "block-1",
    contentId: "content-1",
    fieldKey: "total_check",
    intent: "lock",
    itemVersion: 7,
    kind: "field",
    sourceType: "user_text",
  },
  recoveryAction: "retry",
  requestId: "req-2",
  savedAt: "2026-06-21T00:00:00.000Z",
  values: { value: "590 ₽" },
});
assert.deepEqual(normalize(existingBlockRequestDraft), {
  contentId: "content-1",
  request: {
    body: {
      lock: true,
      source_type: "user_text",
      value: { amount: 590, currency: "RUB" },
    },
    method: "PATCH",
    path: "/api/v1/content-blocks/block-1",
  },
  status: "ready",
  successMessage: "Поле сохранено и зафиксировано.",
  typedDraft: {
    fieldTypes: { value: "money" },
    missingFieldTypes: [],
    typedValues: { value: { amount: 590, currency: "RUB" } },
    valueCount: 1,
  },
});

const newBlockRequestDraft = buildGuidedQueueReplayRequestDraft({
  code: "api_unavailable",
  fieldTypes: { value: "multi_select" },
  metadata: {
    blockId: null,
    contentId: "content-2",
    fieldKey: "features",
    intent: "save",
    itemVersion: 11,
    kind: "field",
    sourceType: "voice_transcript",
  },
  recoveryAction: "retry",
  requestId: "req-3",
  savedAt: "2026-06-21T00:00:00.000Z",
  values: { value: ["terrace", "kids_room"] },
});
assert.deepEqual(normalize(newBlockRequestDraft), {
  contentId: "content-2",
  request: {
    body: {
      lock: false,
      source_type: "voice_transcript",
      value: ["terrace", "kids_room"],
      version: 11,
    },
    method: "PUT",
    path: "/api/v1/content-items/content-2/blocks/features",
  },
  status: "ready",
  successMessage: "Поле сохранено.",
  typedDraft: {
    fieldTypes: { value: "multi_select" },
    missingFieldTypes: [],
    typedValues: { value: ["terrace", "kids_room"] },
    valueCount: 1,
  },
});

const repeatableRequestDraft = buildGuidedQueueReplayRequestDraft({
  code: "api_unavailable",
  fieldTypes: {
    "field:name": "short_text",
    "field:price": "money",
    "field:rating": "rating",
  },
  metadata: {
    contentId: "content-3",
    groupKey: "dishes",
    intent: "lock",
    itemVersion: 14,
    kind: "repeatable_group",
    sourceType: "user_text",
  },
  recoveryAction: "retry",
  requestId: "req-4",
  savedAt: "2026-06-21T00:00:00.000Z",
  values: {
    "field:name": "Уха",
    "field:price": "590 ₽",
    "field:rating": "8",
  },
});
assert.deepEqual(normalize(repeatableRequestDraft), {
  contentId: "content-3",
  request: {
    body: {
      lock: true,
      source_type: "user_text",
      values: {
        name: { text: "Уха" },
        price: { amount: 590, currency: "RUB" },
        rating: 8,
      },
      version: 14,
    },
    method: "POST",
    path: "/api/v1/content-items/content-3/repeatable-groups/dishes",
  },
  status: "ready",
  successMessage: "Позиция добавлена и зафиксирована.",
  typedDraft: {
    fieldTypes: {
      "field:name": "short_text",
      "field:price": "money",
      "field:rating": "rating",
    },
    missingFieldTypes: [],
    typedValues: {
      "field:name": { text: "Уха" },
      "field:price": { amount: 590, currency: "RUB" },
      "field:rating": 8,
    },
    valueCount: 3,
  },
});

const incompleteRequestDraft = buildGuidedQueueReplayRequestDraft({
  code: null,
  fieldTypes: {},
  metadata: null,
  recoveryAction: "retry",
  requestId: null,
  savedAt: "2026-06-21T00:00:00.000Z",
  values: { value: "legacy draft" },
});
assert.deepEqual(normalize(incompleteRequestDraft), {
  missing: ["metadata", "metadata.intent"],
  status: "incomplete",
  typedDraft: {
    fieldTypes: {},
    missingFieldTypes: ["value"],
    typedValues: { value: { text: "legacy draft" } },
    valueCount: 1,
  },
});

const incompleteRepeatableRequestDraft = buildGuidedQueueReplayRequestDraft({
  code: null,
  fieldTypes: {},
  metadata: {
    contentId: "content-4",
    groupKey: "dishes",
    intent: null,
    itemVersion: null,
    kind: "repeatable_group",
    sourceType: "user_text",
  },
  recoveryAction: "retry",
  requestId: null,
  savedAt: "2026-06-21T00:00:00.000Z",
  values: { value: "legacy field draft" },
});
assert.deepEqual(normalize(incompleteRepeatableRequestDraft), {
  missing: ["metadata.intent", "values.fields"],
  status: "incomplete",
  typedDraft: {
    fieldTypes: {},
    missingFieldTypes: ["value"],
    typedValues: { value: { text: "legacy field draft" } },
    valueCount: 1,
  },
});

console.log("guided queue replay readiness checks passed");

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
