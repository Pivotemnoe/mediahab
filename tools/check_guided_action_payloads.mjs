import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const require = createRequire(import.meta.url);
const typescript = require("../apps/web/node_modules/typescript");

const actionValuesModule = await loadServiceModule("guided-action-values.ts");
const moduleScope = await loadServiceModule("guided-action-payloads.ts", {
  FormData,
  require(specifier) {
    if (specifier === "@/services/guided-action-values") {
      return actionValuesModule;
    }
    throw new Error(`Unexpected require: ${specifier}`);
  },
});

const { buildAddRepeatableGroupPayload, buildSaveGuidedFieldPayload } = moduleScope;

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

const moneyFieldSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-2",
  fieldKey: "total_check",
  fieldType: "money",
  intent: "save",
  itemVersion: "4",
  value: "590 ₽",
}));
assert.deepEqual(normalize(moneyFieldSave.request.body), {
  lock: false,
  source_type: "user_text",
  value: { amount: 590, currency: "RUB" },
  version: 4,
});

const unparseableMoneyFieldSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-2",
  fieldKey: "total_check",
  fieldType: "money",
  value: "по меню",
}));
assert.deepEqual(normalize(unparseableMoneyFieldSave.request.body), {
  lock: false,
  source_type: "user_text",
  value: { text: "по меню" },
  version: null,
});

const checkedBooleanSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-2",
  fieldKey: "has_parking",
  fieldType: "boolean",
  value: "true",
}));
assert.deepEqual(normalize(checkedBooleanSave.request.body), {
  lock: false,
  source_type: "user_text",
  value: true,
  version: null,
});

const uncheckedBooleanSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-2",
  fieldKey: "has_parking",
  fieldType: "boolean",
}));
assert.deepEqual(normalize(uncheckedBooleanSave.request.body), {
  lock: false,
  source_type: "user_text",
  value: false,
  version: null,
});

const numberFieldSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-2",
  fieldKey: "wait_minutes",
  fieldType: "number",
  value: "12,5",
}));
assert.deepEqual(normalize(numberFieldSave.request.body), {
  lock: false,
  source_type: "user_text",
  value: 12.5,
  version: null,
});

const ratingFieldSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-2",
  fieldKey: "taste",
  fieldType: "rating",
  value: "7",
}));
assert.deepEqual(normalize(ratingFieldSave.request.body), {
  lock: false,
  source_type: "user_text",
  value: 7,
  version: null,
});

const ambiguousRatingSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-2",
  fieldKey: "taste",
  fieldType: "rating",
  value: "7 из 9",
}));
assert.deepEqual(normalize(ambiguousRatingSave.request.body), {
  lock: false,
  source_type: "user_text",
  value: { text: "7 из 9" },
  version: null,
});

const selectFieldSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-2",
  fieldKey: "visit_type",
  fieldType: "select",
  value: "family_dinner",
}));
assert.deepEqual(normalize(selectFieldSave.request.body), {
  lock: false,
  source_type: "user_text",
  value: "family_dinner",
  version: null,
});

const multiSelectFieldSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-2",
  fieldKey: "features",
  fieldType: "multi_select",
  value: ["terrace", "kids_room", ""],
}));
assert.deepEqual(normalize(multiSelectFieldSave.request.body), {
  lock: false,
  source_type: "user_text",
  value: ["terrace", "kids_room"],
  version: null,
});

const emptyMultiSelectFieldSave = buildSaveGuidedFieldPayload(formData({
  contentId: "content-2",
  fieldKey: "features",
  fieldType: "multi_select",
}));
assert.deepEqual(normalize(emptyMultiSelectFieldSave.request.body), {
  lock: false,
  source_type: "user_text",
  value: [],
  version: null,
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
  "field:rating": "4,5",
  "field:tags": ["soup", "fish", ""],
  "fieldType:name": "short_text",
  "fieldType:observations": "voice_or_long_text",
  "fieldType:price": "money",
  "fieldType:rating": "rating",
  "fieldType:tags": "multi_select",
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
        price: { amount: 350, currency: "RUB" },
        rating: 4.5,
        tags: ["soup", "fish"],
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
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      data.append(key, item);
    }
  }
  return data;
}

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
