import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../apps/web/src/components/phase04/guided-form-actions.tsx", import.meta.url);
const source = await readFile(sourcePath, "utf8");

assert.match(
  source,
  /guidedRepeatableGroupQueueKey/,
  "repeatable queue storage key helper must be imported and used",
);
assert.match(
  source,
  /function repeatableGroupQueueMetadata\(form: HTMLFormElement\): GuidedQueueMetadata \| null \{/,
  "repeatable queue metadata builder must exist",
);

const metadataSource = functionBody(source, "repeatableGroupQueueMetadata");
assert.match(metadataSource, /formTextValue\(form, "contentId"\)/);
assert.match(metadataSource, /formTextValue\(form, "groupKey"\)/);
assert.match(metadataSource, /guidedSubmitIntent\(form\.dataset\.guidedSubmitIntent\)/);
assert.match(metadataSource, /kind: "repeatable_group"/);
assert.match(metadataSource, /sourceType: formTextValue\(form, "sourceType"\) \?\? "user_text"/);

const formSource = functionBody(source, "AddRepeatableGroupActionForm");
assert.match(formSource, /const saveButtonRef = useRef<HTMLButtonElement>\(null\)/);
assert.match(formSource, /const lockButtonRef = useRef<HTMLButtonElement>\(null\)/);
assert.match(formSource, /const queue = useGuidedQueue\(\{/);
assert.match(formSource, /metadata: repeatableGroupQueueMetadata/);
assert.match(formSource, /storageKey: guidedRepeatableGroupQueueKey\(\{/);
assert.match(formSource, /groupKey: field\.fieldKey/);
assert.match(formSource, /recordSubmitIntent\(event\)/);
assert.match(formSource, /<QueueStatusLine/);
assert.match(formSource, /job=\{queue\.queueJob\}/);
assert.match(formSource, /onClear=\{queue\.clearQueue\}/);
assert.match(formSource, /onRetry=\{retryQueuedAdd\}/);
assert.match(formSource, /status=\{queue\.queueStatus\}/);

const queueStatusLabelSource = functionBody(source, "queueStatusLabel");
assert.match(queueStatusLabelSource, /status === "blocked"/);
assert.match(queueStatusLabelSource, /job\?\.metadata\?\.kind === "repeatable_group"/);
assert.match(queueStatusLabelSource, /несинхронизированное добавление позиции/);
assert.match(queueStatusLabelSource, /status === "queued"/);
assert.match(queueStatusLabelSource, /Есть несинхронизированное добавление позиции в этом браузере/);
assert.match(queueStatusLabelSource, /несинхронизированное поле/);
for (const privateValue of ["Черновик", "secret", "legacy", "unclassified"]) {
  assert.equal(
    queueStatusLabelSource.includes(privateValue),
    false,
    `queue status copy must not expose queued value: ${privateValue}`,
  );
}

const queueStatusSource = source.slice(
  source.indexOf("function QueueStatusLine"),
  source.indexOf("function queueStatusLabel"),
);
assert.notEqual(queueStatusSource.length, 0, "QueueStatusLine source must be extractable");
assert.match(queueStatusSource, /const canRetryJob = canRetry && job\?\.recoveryAction !== "refresh"/);
assert.match(queueStatusSource, /const canRefreshJob = status === "blocked" && job\?\.recoveryAction === "refresh"/);
assert.match(queueStatusSource, /canRefreshJob \? \(/);
assert.match(queueStatusSource, /data-guided-queue-kind=\{job\?\.metadata\?\.kind \?\? "none"\}/);
assert.match(queueStatusSource, /data-guided-queue-recovery=\{job\?\.recoveryAction \?\? "none"\}/);
assert.match(queueStatusSource, /data-guided-queue-status=\{status\}/);
assert.match(queueStatusSource, /data-testid="guided-queue-status"/);
assert.match(queueStatusSource, /data-testid="guided-queue-refresh"/);
assert.match(queueStatusSource, /data-testid="guided-queue-retry"/);
assert.match(queueStatusSource, /data-testid="guided-queue-clear"/);
assert.match(queueStatusSource, /onClick=\{refreshPage\}/);
assert.match(queueStatusSource, /Обновить страницу/);
assert.match(queueStatusSource, /Повторить из очереди/);
for (const privateValue of ["Черновик", "secret", "legacy", "unclassified"]) {
  assert.equal(
    queueStatusSource.includes(privateValue),
    false,
    `queue status DOM hooks must not expose queued value: ${privateValue}`,
  );
}

const retrySource = functionBody(formSource, "retryQueuedAdd");
assert.match(retrySource, /draft\.flushDraft\(\)/);
assert.match(retrySource, /queue\.queueJob\?\.metadata\?\.kind === "repeatable_group"/);
assert.match(retrySource, /queue\.queueJob\.metadata\.intent === "lock"/);
assert.match(retrySource, /lockButtonRef\.current\?\.click\(\)/);
assert.match(retrySource, /saveButtonRef\.current\?\.click\(\)/);

const hiddenSubmitButtons = Array.from(
  formSource.matchAll(/<button[\s\S]*?aria-hidden="true"[\s\S]*?name="intent"[\s\S]*?value="(save|lock)"[\s\S]*?\/>/g),
  (match) => match[1],
);
assert.deepEqual(
  hiddenSubmitButtons.sort(),
  ["lock", "save"],
  "repeatable retry must keep hidden native submit buttons for both intents",
);

console.log("guided repeatable queue UI checks passed");

function functionBody(text, functionName) {
  const signature = `function ${functionName}`;
  const start = text.indexOf(signature);
  assert.notEqual(start, -1, `${functionName} must exist`);
  const componentBodyStart = text.indexOf("\n}) {", start);
  const openBrace = functionName === "AddRepeatableGroupActionForm"
    ? (componentBodyStart === -1 ? -1 : componentBodyStart + "\n}) ".length)
    : text.indexOf("{", start);
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
