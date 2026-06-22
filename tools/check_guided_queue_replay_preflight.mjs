import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../apps/web/src/components/phase04/guided-form-actions.tsx", import.meta.url);
const source = await readFile(sourcePath, "utf8");

const queueStatusSource = source.slice(
  source.indexOf("function QueueStatusLine"),
  source.indexOf("function queueStatusLabel"),
);
assert.notEqual(queueStatusSource.length, 0, "QueueStatusLine source must be extractable");
assert.match(queueStatusSource, /const replayPreflight = job \? manualReplayPreflight\(job\) : null/);
assert.match(queueStatusSource, /data-guided-queue-preflight=\{replayPreflight\?\.status \?\? "none"\}/);
assert.match(queueStatusSource, /data-guided-queue-preflight-route=\{replayPreflight\?\.route \?\? "none"\}/);
assert.match(queueStatusSource, /data-guided-queue-retry-shell=\{retryShellStatus\}/);
assert.match(queueStatusSource, /data-testid="guided-queue-preflight"/);
assert.match(queueStatusSource, /data-testid="guided-queue-retry-arm"/);
assert.match(queueStatusSource, /data-testid="guided-queue-retry-shell"/);
assert.match(queueStatusSource, /data-testid="guided-queue-retry-confirm"/);
assert.match(queueStatusSource, /data-testid="guided-queue-retry-cancel"/);
assert.match(queueStatusSource, /\{replayPreflight\.label\}/);
assert.match(queueStatusSource, /Подтвердите повтор/);
assert.match(queueStatusSource, /Сохранённые значения очереди не показываются/);

const preflightSource = functionSlice(source, "manualReplayPreflight", "manualReplayRoute");
assert.match(preflightSource, /buildGuidedQueueReplayRequestDraft\(job\)/);
assert.match(preflightSource, /status: "incomplete"/);
assert.match(preflightSource, /route: "incomplete"/);
assert.match(preflightSource, /Проверка повтора: запрос не собран/);
assert.match(preflightSource, /status: "ready"/);
assert.match(preflightSource, /manualReplayRoute\(draft\.request\.path\)/);
assert.match(preflightSource, /manualReplayRouteLabel\(draft\.request\.path\)/);
assert.match(preflightSource, /значения скрыты и запрос не отправлен/);

const routeSource = functionSlice(source, "manualReplayRoute", "manualReplayRouteLabel");
assert.match(routeSource, /path\.includes\("\/repeatable-groups\/"\)/);
assert.match(routeSource, /return "repeatable_group"/);
assert.match(routeSource, /path\.includes\("\/content-blocks\/"\)/);
assert.match(routeSource, /return "field_block"/);
assert.match(routeSource, /return "field_item"/);

const routeLabelSource = functionSlice(source, "manualReplayRouteLabel", "manualReplayMissingLabel");
assert.match(routeLabelSource, /\/content-items\/\{id\}\/repeatable-groups\/\{key\}/);
assert.match(routeLabelSource, /\/content-blocks\/\{id\}/);
assert.match(routeLabelSource, /\/content-items\/\{id\}\/blocks\/\{key\}/);

for (const privateValue of ["Уха", "590", "terrace", "kids_room", "legacy draft", "Старый локальный черновик"]) {
  assert.equal(
    preflightSource.includes(privateValue) || routeLabelSource.includes(privateValue) || queueStatusSource.includes(privateValue),
    false,
    `preflight source must not expose queued value: ${privateValue}`,
  );
}

console.log("guided queue replay preflight checks passed");

function functionBody(text, functionName) {
  const signature = `function ${functionName}`;
  const start = text.indexOf(signature);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const returnTypeEnd = text.indexOf(") {", start);
  const openBrace = returnTypeEnd === -1 ? text.indexOf("{", start) : returnTypeEnd + 2;
  assert.notEqual(openBrace, -1, `${functionName} must have a body`);

  let depth = 0;
  for (let index = openBrace; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") {
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(openBrace + 1, index);
      }
    }
  }
  throw new Error(`${functionName} body is incomplete`);
}

function functionSlice(text, functionName, nextFunctionName) {
  const start = text.indexOf(`function ${functionName}`);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const end = text.indexOf(`function ${nextFunctionName}`, start);
  assert.notEqual(end, -1, `${nextFunctionName} must exist after ${functionName}`);
  return text.slice(start, end);
}
