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
assert.match(viewSource, /Подключаем микрофон/);
assert.match(viewSource, /Запись идёт/);
assert.match(viewSource, /Остановить и сохранить/);
assert.match(viewSource, /aria-hidden="true" className="h-2 w-full accent-danger"/);
assert.match(viewSource, /Сохраняем на устройстве/);
assert.match(viewSource, /Отправляем и расшифровываем/);
assert.match(viewSource, /Черновик сохранён на этом устройстве/);
assert.match(viewSource, /AudioContext/);
assert.match(viewSource, /syncRequestedRef/);
assert.match(viewSource, /quickVoiceEntryIdRef/);
assert.match(viewSource, /synchronizedVoiceEntryId && quickVoiceEntryIdRef\.current === synchronizedVoiceEntryId/);
assert.match(viewSource, /isCurrentVoiceSyncing/);
assert.match(viewSource, /Отправляем сохранённые заметки/);
assert.match(viewSource, /disabled=\{isSyncing \|\| entry\.status === "syncing"\}/);
assert.match(viewSource, /entry\.status === "syncing" \? "Отправляется…" : "Удалить"/);
assert.doesNotMatch(viewSource, /aria-live="polite" className="inline-flex items-center gap-1\.5 text-xs text-muted"/);
assert.match(viewSource, /role="status"/);
assert.ok(
  viewSource.indexOf("createOfflineNotebookEntry({\n        audioBlob: blob") <
    viewSource.indexOf("synchronizeOfflineEntries();", viewSource.indexOf("async function saveQuickVoice")),
  "voice blob must be stored before a sync attempt",
);
assert.match(shellSource, /navigator\.mediaDevices\.getUserMedia/);
assert.match(shellSource, /requestingMicrophone/);
assert.match(shellSource, /pageActive/);
assert.match(shellSource, /if \(!pageActive \|\| requestGeneration !== microphoneRequestGeneration\)/);
assert.match(shellSource, /microphoneRequestGeneration/);
assert.match(shellSource, /indexedDB\.open/);
assert.match(shellSource, /Остановить и сохранить/);
assert.match(shellSource, /recording-time/);
assert.match(shellSource, /aria-hidden="true" id="recording-time"/);
assert.match(shellSource, /откройте обычный блокнот/i);
assert.match(serviceWorkerSource, /OFFLINE_NOTEBOOK_URL = "\/offline-notebook\.html"/);
assert.match(serviceWorkerSource, /request\.method !== "GET"/);
assert.doesNotMatch(serviceWorkerSource, /addEventListener\("sync"/);
assert.match(apiSource, /client_note_id: UUID \| None = None/g);
assert.match(apiSource, /id=payload\.client_note_id or uuid4\(\)/g);

console.log("offline notebook contract checks passed");
