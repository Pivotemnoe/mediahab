import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../apps/web/src/components/phase04/guided-form-actions.tsx", import.meta.url);
const source = await readFile(sourcePath, "utf8");

const queueStatusSource = source.slice(
  source.indexOf("function QueueStatusLine"),
  source.indexOf("function queueStatusLabel"),
);
assert.notEqual(queueStatusSource.length, 0, "QueueStatusLine source must be extractable");
assert.match(queueStatusSource, /data-guided-queue-retry-shell=\{retryShellStatus\}/);
assert.match(queueStatusSource, /data-testid="guided-queue-retry-arm"/);
assert.match(queueStatusSource, /data-testid="guided-queue-retry-shell"/);
assert.match(queueStatusSource, /data-testid="guided-queue-retry-confirm"/);
assert.match(queueStatusSource, /data-testid="guided-queue-retry-cancel"/);
assert.match(queueStatusSource, /Проверь текущие значения и повтори сохранение/);
assert.doesNotMatch(queueStatusSource, /guided-queue-preflight|replayPreflight/);
assert.doesNotMatch(source, /Проверка повтора:|значения скрыты и запрос не отправлен|Для повтора не хватает/);

for (const privateValue of ["Уха", "590", "terrace", "kids_room", "legacy draft", "Старый локальный черновик"]) {
  assert.equal(
    queueStatusSource.includes(privateValue),
    false,
    `preflight source must not expose queued value: ${privateValue}`,
  );
}

console.log("guided queue replay preflight checks passed");
