import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const capabilitiesPath = new URL("../apps/web/public/sw-capabilities.json", import.meta.url);
const serviceWorkerPath = new URL("../apps/web/public/sw.js", import.meta.url);

const capabilities = JSON.parse(await readFile(capabilitiesPath, "utf8"));
const serviceWorkerSource = await readFile(serviceWorkerPath, "utf8");

assert.equal(capabilities.version, 1);
assert.equal(capabilities.serviceWorker.script, "/sw.js");
assert.equal(capabilities.serviceWorker.strategy, "shell-get-cache");
assert.equal(capabilities.capabilities.mutationReplay, false);
assert.equal(capabilities.capabilities.backgroundSync, false);
assert.equal(capabilities.capabilities.offlineNavigationFallback, true);
assert.equal(capabilities.replayPolicy.guidedFormQueue, "manual_retry_required");
assert.equal(capabilities.replayPolicy.reason, "http_only_cookie_csrf_required");

const cacheNameMatch = serviceWorkerSource.match(/CACHE_NAME\s*=\s*"([^"]+)"/);
assert.equal(cacheNameMatch?.[1], capabilities.serviceWorker.cacheName);

for (const shellUrl of capabilities.serviceWorker.shellUrls) {
  assert.match(serviceWorkerSource, new RegExp(`"${escapeRegExp(shellUrl)}"`));
}

assert.match(serviceWorkerSource, /request\.method !== "GET"[\s\S]*?return;/);
assert.doesNotMatch(serviceWorkerSource, /addEventListener\("sync"/);
assert.doesNotMatch(serviceWorkerSource, /addEventListener\("periodicsync"/);
assert.doesNotMatch(serviceWorkerSource, /BackgroundSync/i);
assert.doesNotMatch(serviceWorkerSource, /fetch\([^)]*method:\s*"(POST|PUT|PATCH|DELETE)"/);

console.log("service worker capability checks passed");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
