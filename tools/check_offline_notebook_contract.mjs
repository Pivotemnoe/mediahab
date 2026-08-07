import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [storeSource, viewSource, shellSource, serviceWorkerSource, apiSource] = await Promise.all([
  readFile(new URL("apps/web/src/services/offline-notebook.ts", root), "utf8"),
  readFile(new URL("apps/web/src/components/notebook/notebook-view.tsx", root), "utf8"),
  readFile(new URL("apps/web/public/offline-notebook.html", root), "utf8"),
  readFile(new URL("apps/web/public/sw.js", root), "utf8"),
  readFile(new URL("services/api/app/api/v1/routes/notebook.py", root), "utf8"),
]);

for (const source of [storeSource, shellSource]) {
  assert.match(source, /nagovori-offline-v1/);
  assert.match(source, /notebookQueue/);
  assert.match(source, /nagovori:offline-workspace-id/);
}

assert.match(viewSource, /createOfflineNotebookEntry/);
assert.match(viewSource, /client_note_id: entry\.id/);
assert.match(viewSource, /audioBlob: blob/);
assert.ok(
  viewSource.indexOf("createOfflineNotebookEntry({\n        audioBlob: blob") <
    viewSource.indexOf("synchronizeOfflineEntries();", viewSource.indexOf("async function saveQuickVoice")),
  "voice blob must be stored before a sync attempt",
);
assert.match(shellSource, /navigator\.mediaDevices\.getUserMedia/);
assert.match(shellSource, /indexedDB\.open/);
assert.match(serviceWorkerSource, /OFFLINE_NOTEBOOK_URL = "\/offline-notebook\.html"/);
assert.match(serviceWorkerSource, /request\.method !== "GET"/);
assert.doesNotMatch(serviceWorkerSource, /addEventListener\("sync"/);
assert.match(apiSource, /client_note_id: UUID \| None = None/g);
assert.match(apiSource, /id=payload\.client_note_id or uuid4\(\)/g);

console.log("offline notebook contract checks passed");
