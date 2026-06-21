import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const require = createRequire(import.meta.url);
const typescript = require("../apps/web/node_modules/typescript");

const sourcePath = new URL("../apps/web/src/services/guided-queue-replay.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const transpiled = typescript.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: typescript.ModuleKind.CommonJS,
    target: typescript.ScriptTarget.ES2022,
  },
  fileName: "guided-queue-replay.ts",
});

const moduleScope = {
  exports: {},
  module: { exports: {} },
};
moduleScope.exports = moduleScope.module.exports;

new Script(transpiled.outputText, { filename: "guided-queue-replay.cjs" }).runInNewContext(moduleScope);

const { getGuidedQueueReplayReadiness } = moduleScope.module.exports;

function queueEntries(count) {
  return Array.from({ length: count }, (_, index) => ({
    job: {
      code: null,
      recoveryAction: "retry",
      requestId: null,
      savedAt: "2026-06-21T00:00:00.000Z",
      values: { value: `draft ${index + 1}` },
    },
    storageKey: `tmh:guided-form-queue:v1:field:demo:${index + 1}:new`,
  }));
}

assert.equal(typeof getGuidedQueueReplayReadiness, "function");

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

console.log("guided queue replay readiness checks passed");

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}
