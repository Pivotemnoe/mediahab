import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const require = createRequire(import.meta.url);
const typescript = require("../apps/web/node_modules/typescript");

const sourcePath = new URL("../apps/web/src/services/guided-action-errors.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const transpiled = typescript.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: typescript.ModuleKind.CommonJS,
    target: typescript.ScriptTarget.ES2022,
  },
  fileName: "guided-action-errors.ts",
});

const moduleScope = {
  exports: {},
  module: { exports: {} },
};
moduleScope.exports = moduleScope.module.exports;

new Script(transpiled.outputText, { filename: "guided-action-errors.cjs" }).runInNewContext(moduleScope);

const {
  guidedActionMessageForCode,
  guidedActionRecoveryAction,
  guidedActionStateFromApiError,
  guidedActionUnavailableState,
} = moduleScope.module.exports;

assert.equal(typeof guidedActionStateFromApiError, "function");
assert.equal(typeof guidedActionUnavailableState, "function");

const csrfRequired = guidedActionStateFromApiError(apiError("csrf_required", 403, "req-csrf-required"));
assert.equal(csrfRequired.code, "csrf_required");
assert.match(csrfRequired.message, /Страница давно открыта/);
assert.equal(csrfRequired.recoveryAction, "refresh");
assert.equal(csrfRequired.requestId, "req-csrf-required");
assert.equal(csrfRequired.tone, "danger");

const csrfInvalid = guidedActionStateFromApiError(apiError("csrf_invalid", 403, "req-csrf-invalid"));
assert.equal(csrfInvalid.recoveryAction, "refresh");
assert.match(csrfInvalid.message, /Страница давно открыта/);
assert.equal(csrfInvalid.tone, "danger");

const conflict = guidedActionStateFromApiError(apiError("version_conflict", 409, "req-conflict"));
assert.equal(conflict.recoveryAction, "refresh");
assert.match(conflict.message, /Публикация изменилась/);
assert.equal(conflict.requestId, "req-conflict");
assert.equal(conflict.tone, "warning");

const rejected = guidedActionStateFromApiError(apiError("validation_error", 400, "req-validation"));
assert.equal(rejected.recoveryAction, "retry");
assert.equal(rejected.message, "Изменение не сохранено. Проверь поле и повтори действие.");
assert.equal(rejected.tone, "danger");

const serverError = guidedActionStateFromApiError(apiError("backend_error", 503, "req-backend"));
assert.equal(serverError.recoveryAction, "retry");
assert.equal(serverError.message, "Сейчас не удаётся сохранить изменение. Повтори позже.");
assert.equal(serverError.requestId, "req-backend");

const unavailable = guidedActionUnavailableState();
assert.deepEqual(normalize(unavailable), {
  code: "api_unavailable",
  message: "Изменение не сохранилось. Проверь интернет и попробуй ещё раз.",
  recoveryAction: "retry",
  requestId: null,
  tone: "danger",
});

assert.equal(guidedActionRecoveryAction("version_conflict"), "refresh");
assert.equal(guidedActionRecoveryAction("unknown_code"), "retry");
assert.equal(guidedActionMessageForCode("unknown_code", 500), "Сейчас не удаётся сохранить изменение. Повтори позже.");
assert.equal(guidedActionMessageForCode("unknown_code", 422), "Изменение не сохранено. Проверь поле и повтори действие.");

console.log("guided action error mapping checks passed");

function apiError(code, status, requestId) {
  return { code, requestId, status };
}

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}
