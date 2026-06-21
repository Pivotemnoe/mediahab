import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const require = createRequire(import.meta.url);
const typescript = require("../apps/web/node_modules/typescript");

const sourcePath = new URL("../apps/web/src/services/guided-action-payloads.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const transpiled = typescript.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: typescript.ModuleKind.CommonJS,
    target: typescript.ScriptTarget.ES2022,
  },
  fileName: "guided-action-payloads.ts",
});

const moduleScope = {
  exports: {},
  FormData,
  module: { exports: {} },
};
moduleScope.exports = moduleScope.module.exports;

new Script(transpiled.outputText, { filename: "guided-action-payloads.cjs" }).runInNewContext(moduleScope);

const { buildAddRepeatableGroupPayload, buildSaveGuidedFieldPayload } = moduleScope.module.exports;

assert.equal(typeof buildSaveGuidedFieldPayload, "function");
assert.equal(typeof buildAddRepeatableGroupPayload, "function");

const existingBlockSave = buildSaveGuidedFieldPayload(formData({
  blockId: "block-1",
  contentId: "content-1",
  fieldKey: "venue_name",
  intent: "lock",
  itemVersion: "7",
  sourceType: "user_text",
  value: "Старый город",
}));
assert.deepEqual(normalize(existingBlockSave), {
  contentId: "content-1",
  request: {
    body: {
      lock: true,
      source_type: "user_text",
      value: { text: "Старый город" },
    },
    method: "PATCH",
    path: "/api/v1/content-blocks/block-1",
  },
  successMessage: "Поле сохранено и зафиксировано.",
});

const newFieldSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-2",
  fieldKey: "atmosphere",
  intent: "save",
  itemVersion: "3",
  sourceType: "voice_transcript",
  value: "Тихо, быстро, без очереди.",
}));
assert.deepEqual(normalize(newFieldSave), {
  contentId: "content-2",
  request: {
    body: {
      lock: false,
      source_type: "voice_transcript",
      value: { text: "Тихо, быстро, без очереди." },
      version: 3,
    },
    method: "PUT",
    path: "/api/v1/content-items/content-2/blocks/atmosphere",
  },
  successMessage: "Поле сохранено.",
});

const emptyOptionalSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-3",
  fieldKey: "conclusion",
}));
assert.equal(emptyOptionalSave.request.method, "PUT");
assert.deepEqual(normalize(emptyOptionalSave.request.body), {
  lock: false,
  source_type: "user_text",
  value: { text: "" },
  version: null,
});

const repeatableAdd = buildAddRepeatableGroupPayload(formData({
  contentId: "content-4",
  "field:name": "Уха",
  "field:observations": "Рыбный вкус нормальный.",
  "field:price": "350 RUB",
  groupKey: "dishes",
  intent: "lock",
  itemVersion: "8",
}));
assert.deepEqual(normalize(repeatableAdd), {
  contentId: "content-4",
  request: {
    body: {
      lock: true,
      source_type: "user_text",
      values: {
        name: { text: "Уха" },
        observations: { text: "Рыбный вкус нормальный." },
        price: { text: "350 RUB" },
      },
      version: 8,
    },
    method: "POST",
    path: "/api/v1/content-items/content-4/repeatable-groups/dishes",
  },
  successMessage: "Позиция добавлена и зафиксирована.",
});

assert.throws(
  () => buildSaveGuidedFieldPayload(formData({ contentId: "content-5" })),
  /Missing form field: fieldKey/,
);
assert.throws(
  () => buildAddRepeatableGroupPayload(formData({ groupKey: "dishes" })),
  /Missing form field: contentId/,
);

console.log("guided action payload contract checks passed");

function formData(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}
