"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Circle,
  Clipboard,
  Clock3,
  CloudUpload,
  FilePlus2,
  HardDrive,
  Lightbulb,
  Loader2,
  Mic,
  Pin,
  PinOff,
  RotateCcw,
  Search,
  Trash2,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  MediaOut,
  MediaPresignResponse,
  NotebookNoteListResponse,
  NotebookNoteOut,
  NotebookTranscriptionOut,
  NotebookTransferOut,
} from "@/services/openapi-types";
import type { NotebookViewModel } from "@/services/notebook";
import {
  createOfflineNotebookEntry,
  deleteOfflineNotebookEntry,
  listOfflineNotebookEntries,
  OFFLINE_NOTEBOOK_CHANGED_EVENT,
  rememberOfflineNotebookWorkspace,
  requestPersistentNotebookStorage,
  updateOfflineNotebookEntry,
  type OfflineNotebookEntry,
} from "@/services/offline-notebook";

type SaveState = "idle" | "offline" | "saved" | "saving" | "error";
type ListMode = "active" | "archived" | "deleted";
type QuickVoiceState = "idle" | "requesting" | "recording" | "saving";
type VoiceReceiptState = "none" | "saved" | "waiting" | "synced" | "error";
type DraftLocalState = "empty" | "saving" | "saved";

function csrfToken(): string | null {
  const row = document.cookie.split("; ").find((cookie) => cookie.startsWith("tmh_csrf="));
  return row ? decodeURIComponent(row.slice("tmh_csrf=".length)) : null;
}

async function apiRequest<T>(
  path: string,
  options: { body?: unknown; method: "DELETE" | "GET" | "PATCH" | "POST" },
): Promise<T> {
  const token = csrfToken();
  const response = await fetch(path, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { "X-CSRF-Token": token } : {}),
    },
    method: options.method,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message || `Ошибка сервера ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

function kindLabel(value: NotebookNoteOut["kind"]): string {
  return {
    draft: "черновик",
    idea: "идея",
    link: "ссылка",
    observation: "наблюдение",
    other: "мысль",
    task: "задача",
  }[value ?? "other"];
}

function savedLabel(state: SaveState): string {
  return {
    error: "не сохранено",
    idle: "",
    offline: "offline · черновик на устройстве",
    saved: "сохранено",
    saving: "сохраняю…",
  }[state];
}

function formatRecordingTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function LocalNotebookTimestamp({ value }: { value: string }) {
  const [label, setLabel] = useState("—");

  useEffect(() => {
    setLabel(new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
    }).format(new Date(value)));
  }, [value]);

  return <span className="text-xs text-muted">{label}</span>;
}

async function uploadVoiceMedia({ blob, workspaceId }: { blob: Blob; workspaceId: string }): Promise<string> {
  const mimeType = blob.type || "audio/webm";
  const presign = await apiRequest<MediaPresignResponse>("/api/v1/media/presign-upload", {
    body: {
      content_item_id: null,
      filename: `notebook-${Date.now()}.${extensionForMimeType(mimeType)}`,
      kind: "voice",
      mime_type: mimeType,
      size_bytes: blob.size,
      workspace_id: workspaceId,
    },
    method: "POST",
  });
  const upload = await fetch(presign.upload_url, {
    body: blob,
    headers: { "Content-Type": mimeType },
    method: "PUT",
  });
  if (!upload.ok) throw new Error("Не удалось загрузить голосовую заметку.");
  await apiRequest<MediaOut>(`/api/v1/media/${presign.media_id}/complete-upload`, {
    body: { codec_metadata: { source: "notebook" }, size_bytes: blob.size },
    method: "POST",
  });
  return presign.media_id;
}

async function synchronizeOfflineEntry(entry: OfflineNotebookEntry): Promise<NotebookNoteOut> {
  let mediaId = entry.mediaId;
  await updateOfflineNotebookEntry(entry.id, {
    attempts: entry.attempts + 1,
    error: undefined,
    status: "syncing",
  });
  if (entry.audioBlob?.size && !mediaId) {
    mediaId = await uploadVoiceMedia({ blob: entry.audioBlob, workspaceId: entry.workspaceId });
    await updateOfflineNotebookEntry(entry.id, { mediaId });
  }
  if (entry.audioBlob?.size) {
    if (!mediaId) throw new Error("Голосовая заметка не загружена.");
    return apiRequest<NotebookNoteOut>("/api/v1/notebook/transcribe-new", {
      body: {
        body: entry.body,
        client_note_id: entry.id,
        kind: entry.kind,
        media_id: mediaId,
        provider_key: "default",
        workspace_id: entry.workspaceId,
      },
      method: "POST",
    });
  }
  return apiRequest<NotebookNoteOut>("/api/v1/notebook", {
    body: {
      body: entry.body,
      client_note_id: entry.id,
      kind: entry.kind,
      workspace_id: entry.workspaceId,
    },
    method: "POST",
  });
}

async function transcribeVoiceIntoNote({ blob, note, workspaceId }: { blob: Blob; note: NotebookNoteOut; workspaceId: string }): Promise<NotebookNoteOut> {
  const mediaId = await uploadVoiceMedia({ blob, workspaceId });
  const run = await apiRequest<NotebookTranscriptionOut>(`/api/v1/notebook/${note.id}/transcribe`, {
    body: { media_id: mediaId, provider_key: "default" },
    method: "POST",
  });
  return apiRequest<NotebookNoteOut>(`/api/v1/notebook-transcriptions/${run.id}/accept`, {
    body: {
      append: true,
      corrected_text: run.transcript_text || "",
      note_version: note.version,
    },
    method: "POST",
  });
}

interface NoteCardProps {
  contentItems: NotebookViewModel["contentItems"];
  note: NotebookNoteOut;
  onChanged: (note: NotebookNoteOut) => void;
  onRemoved: (id: string) => void;
  projects: NotebookViewModel["projects"];
  workspaceId: string;
}

function NoteCard({ contentItems, note, onChanged, onRemoved, projects, workspaceId }: NoteCardProps) {
  const router = useRouter();
  const [body, setBody] = useState(note.body);
  const [kind, setKind] = useState<NotebookNoteOut["kind"]>(note.kind);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [contentId, setContentId] = useState(contentItems[0]?.id ?? "");
  const currentRef = useRef(note);
  const initializedRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const draftKey = `tmh:notebook:${workspaceId}:${note.id}`;

  useEffect(() => {
    currentRef.current = note;
  }, [note]);

  useEffect(() => {
    const recovered = window.localStorage.getItem(draftKey);
    if (recovered && recovered !== note.body) {
      setBody(recovered);
      setSaveState("offline");
    }
    initializedRef.current = true;
  }, [draftKey, note.body]);

  useEffect(() => {
    if (!initializedRef.current || body === currentRef.current.body && kind === currentRef.current.kind) return;
    window.localStorage.setItem(draftKey, body);
    if (!navigator.onLine) {
      setSaveState("offline");
      return;
    }
    setSaveState("saving");
    const timeout = window.setTimeout(async () => {
      try {
        const updated = await apiRequest<NotebookNoteOut>(`/api/v1/notebook/${note.id}`, {
          body: { body, kind, version: currentRef.current.version },
          method: "PATCH",
        });
        currentRef.current = updated;
        window.localStorage.removeItem(draftKey);
        setSaveState("saved");
        onChanged(updated);
      } catch (error) {
        setSaveState(navigator.onLine ? "error" : "offline");
        setMessage(error instanceof Error ? error.message : "Не удалось сохранить заметку.");
      }
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [body, draftKey, kind, note.id, onChanged]);

  async function patchNote(patch: Record<string, unknown>) {
    try {
      const updated = await apiRequest<NotebookNoteOut>(`/api/v1/notebook/${note.id}`, {
        body: { ...patch, version: currentRef.current.version },
        method: "PATCH",
      });
      currentRef.current = updated;
      onChanged(updated);
      setMessage("Изменение сохранено.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось изменить заметку.");
    }
  }

  async function removeOrRestore() {
    try {
      const path = note.deleted ? `/api/v1/notebook/${note.id}/restore` : `/api/v1/notebook/${note.id}`;
      const updated = await apiRequest<NotebookNoteOut>(path, {
        method: note.deleted ? "POST" : "DELETE",
      });
      onRemoved(note.id);
      setMessage(updated.deleted ? "Заметка в корзине." : "Заметка восстановлена.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Действие не выполнено.");
    }
  }

  async function transfer(bodyPayload: { content_item_id?: string; project_id?: string }) {
    try {
      setMessage("Переношу заметку…");
      const result = await apiRequest<NotebookTransferOut>(`/api/v1/notebook/${note.id}/transfer`, {
        body: bodyPayload,
        method: "POST",
      });
      setMessage("Заметка сохранена, материал открыт в обычном редакторе.");
      router.push(result.composer_url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось перенести заметку.");
    }
  }

  async function uploadVoice(blob: Blob) {
    try {
      setMessage("Загружаю и расшифровываю голос…");
      const updated = await transcribeVoiceIntoNote({ blob, note: currentRef.current, workspaceId });
      currentRef.current = updated;
      setBody(updated.body);
      onChanged(updated);
      setMessage("Голос расшифрован и добавлен в заметку.");
    } catch (error) {
      try {
        await createOfflineNotebookEntry({ audioBlob: blob, audioMimeType: blob.type, body: "", workspaceId });
        setMessage("Связи нет. Запись сохранена на устройстве и появится как отдельная заметка после синхронизации.");
      } catch {
        setMessage(error instanceof Error ? error.message : "Не удалось сохранить голос.");
      }
    }
  }

  async function toggleRecording() {
    if (recorderRef.current) {
      recorderRef.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        void uploadVoice(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.start();
      recorderRef.current = recorder;
      setMessage("Идёт запись. Нажмите ещё раз, чтобы закончить.");
    } catch {
      setMessage("Браузер не дал доступ к микрофону.");
    }
  }

  return (
    <Card className="grid gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={note.pinned ? "success" : "neutral"}>{kindLabel(kind)}</Badge>
          <LocalNotebookTimestamp value={note.updated_at} />
        </div>
        <span aria-live="polite" className="text-xs text-muted">{savedLabel(saveState)}</span>
      </div>

      <textarea
        aria-label="Текст заметки"
        className="min-h-32 w-full resize-y rounded-lg border border-border bg-background p-3 text-base leading-6 text-foreground outline-none focus:border-primary"
        onChange={(event) => setBody(event.target.value)}
        placeholder="Идея, наблюдение, задача, ссылка или черновик…"
        value={body}
      />
      {!note.deleted ? (
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Тип заметки"
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
            onChange={(event) => setKind(event.target.value as NotebookNoteOut["kind"])}
            value={kind ?? "other"}
          >
            <option value="idea">Идея</option><option value="observation">Наблюдение</option>
            <option value="task">Задача</option><option value="link">Ссылка</option>
            <option value="draft">Черновик</option><option value="other">Без типа</option>
          </select>
          <Button onClick={() => void toggleRecording()} type="button" variant="secondary">
            <Mic size={16} /> {recorderRef.current ? "Закончить запись" : "Надиктовать"}
          </Button>
          <Button onClick={() => void navigator.clipboard.writeText(body)} type="button" variant="secondary">
            <Clipboard size={16} /> Копировать
          </Button>
          <Button onClick={() => void patchNote({ pinned: !note.pinned })} type="button" variant="ghost">
            {note.pinned ? <PinOff size={16} /> : <Pin size={16} />} {note.pinned ? "Открепить" : "Закрепить"}
          </Button>
          <Button onClick={() => void patchNote({ archived: !note.archived })} type="button" variant="ghost">
            {note.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />} {note.archived ? "Вернуть" : "В архив"}
          </Button>
          <Button onClick={() => void removeOrRestore()} type="button" variant="ghost"><Trash2 size={16} /> В корзину</Button>
        </div>
      ) : (
        <Button className="justify-self-start" onClick={() => void removeOrRestore()} type="button" variant="secondary">
          <RotateCcw size={16} /> Восстановить
        </Button>
      )}

      {!note.deleted && !note.archived ? (
        <div className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3 lg:grid-cols-2">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select className="h-10 min-w-0 rounded-md border border-border bg-surface px-3 text-sm" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
              <option value="">Выберите проект</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <Button disabled={!projectId || !body.trim()} onClick={() => void transfer({ project_id: projectId })} type="button">
              <FilePlus2 size={16} /> Новый материал
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select className="h-10 min-w-0 rounded-md border border-border bg-surface px-3 text-sm" onChange={(event) => setContentId(event.target.value)} value={contentId}>
              <option value="">Выберите материал</option>
              {contentItems.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <Button disabled={!contentId || !body.trim()} onClick={() => void transfer({ content_item_id: contentId })} type="button" variant="secondary">
              Добавить
            </Button>
          </div>
        </div>
      ) : null}
      {message ? <p aria-live="polite" className="text-sm text-muted">{message}</p> : null}
    </Card>
  );
}

export function NotebookView({ viewModel }: { viewModel: NotebookViewModel }) {
  const [notes, setNotes] = useState(viewModel.notes);
  const [offlineEntries, setOfflineEntries] = useState<OfflineNotebookEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ListMode>("active");
  const [message, setMessage] = useState(viewModel.notice ?? "");
  const [isOnline, setIsOnline] = useState(true);
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [quickVoiceState, setQuickVoiceState] = useState<QuickVoiceState>("idle");
  const [voiceReceiptState, setVoiceReceiptState] = useState<VoiceReceiptState>("none");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [draftLocalState, setDraftLocalState] = useState<DraftLocalState>("empty");
  const draftRef = useRef("");
  const quickRecorderRef = useRef<MediaRecorder | null>(null);
  const quickChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isMountedRef = useRef(true);
  const voiceMeterFrameRef = useRef<number | null>(null);
  const voiceMeterLastUpdateRef = useRef(0);
  const quickVoiceEntryIdRef = useRef<string | null>(null);
  const syncInFlightRef = useRef(false);
  const syncRequestedRef = useRef(false);
  const draftKey = viewModel.workspaceId ? `tmh:notebook:${viewModel.workspaceId}:new` : "";

  const refreshOfflineEntries = useCallback(async () => {
    if (!viewModel.workspaceId) {
      setOfflineEntries([]);
      return;
    }
    try {
      setOfflineEntries(await listOfflineNotebookEntries(viewModel.workspaceId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось прочитать заметки на устройстве.");
    }
  }, [viewModel.workspaceId]);

  const synchronizeOfflineEntries = useCallback(async () => {
    if (!viewModel.workspaceId || typeof navigator === "undefined" || !navigator.onLine) return;
    if (syncInFlightRef.current) {
      syncRequestedRef.current = true;
      return;
    }
    syncInFlightRef.current = true;
    setIsSyncing(true);
    let synchronized = 0;
    let failed = 0;
    let failedVoiceEntryId: string | null = null;
    let synchronizedVoiceEntryId: string | null = null;
    try {
      const entries = await listOfflineNotebookEntries(viewModel.workspaceId);
      for (const entry of entries) {
        try {
          const note = await synchronizeOfflineEntry(entry);
          setNotes((current) => current.some((row) => row.id === note.id)
            ? current.map((row) => row.id === note.id ? note : row)
            : [note, ...current]);
          await deleteOfflineNotebookEntry(entry.id);
          if (entry.id === quickVoiceEntryIdRef.current) synchronizedVoiceEntryId = entry.id;
          synchronized += 1;
        } catch (error) {
          if (entry.id === quickVoiceEntryIdRef.current) failedVoiceEntryId = entry.id;
          failed += 1;
          await updateOfflineNotebookEntry(entry.id, {
            error: error instanceof Error ? error.message : "Не удалось синхронизировать.",
            status: "error",
          });
        }
      }
      await refreshOfflineEntries();
      if (synchronized && !failed) {
        setServerUnavailable(false);
        setMessage(`Отправлено в блокнот: ${synchronized}.`);
      } else if (failed) {
        setServerUnavailable(true);
        setMessage("Сохранённые заметки остались на устройстве. Повторим, когда API станет доступен.");
      }
      if (synchronizedVoiceEntryId && quickVoiceEntryIdRef.current === synchronizedVoiceEntryId) {
        quickVoiceEntryIdRef.current = null;
        setVoiceReceiptState("synced");
      } else if (failedVoiceEntryId && quickVoiceEntryIdRef.current === failedVoiceEntryId) {
        setVoiceReceiptState("waiting");
      }
    } finally {
      const shouldRunAgain = syncRequestedRef.current && navigator.onLine;
      syncRequestedRef.current = false;
      syncInFlightRef.current = false;
      setIsSyncing(false);
      if (shouldRunAgain) void synchronizeOfflineEntries();
    }
  }, [refreshOfflineEntries, viewModel.workspaceId]);

  useEffect(() => {
    if (!draftKey) return;
    const recovered = window.localStorage.getItem(draftKey) ?? "";
    setDraft(recovered);
    draftRef.current = recovered;
    setDraftLocalState(recovered ? "saved" : "empty");
  }, [draftKey]);

  useEffect(() => {
    if (!viewModel.workspaceId) return;
    rememberOfflineNotebookWorkspace(viewModel.workspaceId);
    void requestPersistentNotebookStorage();
    void refreshOfflineEntries();
    setIsOnline(navigator.onLine);
    if (navigator.onLine) void synchronizeOfflineEntries();

    const handleOnline = () => {
      setIsOnline(true);
      setServerUnavailable(false);
      void synchronizeOfflineEntries();
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueueChange = () => void refreshOfflineEntries();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_NOTEBOOK_CHANGED_EVENT, handleQueueChange);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_NOTEBOOK_CHANGED_EVENT, handleQueueChange);
    };
  }, [refreshOfflineEntries, synchronizeOfflineEntries, viewModel.workspaceId]);

  useEffect(() => {
    if (!draftKey) return;
    draftRef.current = draft;
    const timeout = window.setTimeout(() => {
      if (draft) {
        window.localStorage.setItem(draftKey, draft);
        setDraftLocalState("saved");
      } else {
        window.localStorage.removeItem(draftKey);
        setDraftLocalState("empty");
      }
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [draft, draftKey]);

  useEffect(() => {
    if (quickVoiceState !== "recording") return;
    const interval = window.setInterval(() => setRecordingSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [quickVoiceState]);

  function stopVoiceMeter() {
    if (voiceMeterFrameRef.current !== null) {
      window.cancelAnimationFrame(voiceMeterFrameRef.current);
      voiceMeterFrameRef.current = null;
    }
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
    setVoiceLevel(0);
  }

  function startVoiceMeter(stream: MediaStream) {
    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const values = new Uint8Array(analyser.frequencyBinCount);
      audioContextRef.current = context;
      voiceMeterLastUpdateRef.current = 0;

      const measure = (timestamp: number) => {
        analyser.getByteTimeDomainData(values);
        if (timestamp - voiceMeterLastUpdateRef.current > 80) {
          let sum = 0;
          for (const value of values) {
            const normalized = (value - 128) / 128;
            sum += normalized * normalized;
          }
          setVoiceLevel(Math.min(1, Math.sqrt(sum / values.length) * 4));
          voiceMeterLastUpdateRef.current = timestamp;
        }
        voiceMeterFrameRef.current = window.requestAnimationFrame(measure);
      };
      voiceMeterFrameRef.current = window.requestAnimationFrame(measure);
    } catch {
      setVoiceLevel(0.12);
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const recorder = quickRecorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stream.getTracks().forEach((track) => track.stop());
        quickRecorderRef.current = null;
      }
      if (voiceMeterFrameRef.current !== null) window.cancelAnimationFrame(voiceMeterFrameRef.current);
      const context = audioContextRef.current;
      if (context && context.state !== "closed") void context.close();
    };
  }, []);

  const visible = useMemo(
    () => notes.filter((note) => note.body.toLocaleLowerCase("ru").includes(query.toLocaleLowerCase("ru"))),
    [notes, query],
  );

  async function createNote() {
    if (!viewModel.workspaceId || !draft.trim()) return;
    try {
      await createOfflineNotebookEntry({ body: draft, workspaceId: viewModel.workspaceId });
      setDraft("");
      setDraftLocalState("empty");
      await refreshOfflineEntries();
      setMessage("Заметка сначала сохранена на этом устройстве.");
      if (navigator.onLine) void synchronizeOfflineEntries();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить заметку.");
    }
  }

  async function saveQuickVoice(blob: Blob) {
    if (!viewModel.workspaceId) return;
    if (!blob.size) {
      setQuickVoiceState("idle");
      setMessage("Не получилось записать звук. Попробуйте ещё раз.");
      return;
    }
    try {
      setQuickVoiceState("saving");
      setVoiceReceiptState("none");
      const entry = await createOfflineNotebookEntry({
        audioBlob: blob,
        audioMimeType: blob.type,
        body: draftRef.current,
        workspaceId: viewModel.workspaceId,
      });
      quickVoiceEntryIdRef.current = entry.id;
      setDraft("");
      setDraftLocalState("empty");
      await refreshOfflineEntries();
      setVoiceReceiptState(navigator.onLine ? "saved" : "waiting");
      setMessage(navigator.onLine
        ? "Голос сохранён на устройстве. Теперь отправляем его на расшифровку."
        : "Голос сохранён на устройстве. Откройте блокнот снова, когда появится интернет.");
      setQuickVoiceState("idle");
      if (navigator.onLine) await synchronizeOfflineEntries();
    } catch (error) {
      quickVoiceEntryIdRef.current = null;
      setVoiceReceiptState("error");
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить голосовую заметку.");
    } finally {
      setQuickVoiceState("idle");
    }
  }

  async function toggleQuickRecording() {
    if (quickVoiceState === "saving") return;
    if (quickRecorderRef.current) {
      setQuickVoiceState("saving");
      setMessage("Останавливаю запись и сохраняю её на этом устройстве…");
      quickRecorderRef.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Этот браузер не поддерживает запись с микрофона.");
      return;
    }
    let requestedStream: MediaStream | null = null;
    try {
      setQuickVoiceState("requesting");
      setVoiceReceiptState("none");
      setRecordingSeconds(0);
      setMessage("Подключаем микрофон…");
      requestedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isMountedRef.current) {
        requestedStream.getTracks().forEach((track) => track.stop());
        return;
      }
      const recorder = new MediaRecorder(requestedStream);
      quickChunksRef.current = [];
      recorder.ondataavailable = (event) => event.data.size && quickChunksRef.current.push(event.data);
      recorder.onstop = () => {
        requestedStream?.getTracks().forEach((track) => track.stop());
        quickRecorderRef.current = null;
        stopVoiceMeter();
        void saveQuickVoice(new Blob(quickChunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.start();
      quickRecorderRef.current = recorder;
      startVoiceMeter(requestedStream);
      setQuickVoiceState("recording");
      setMessage("Запись идёт. Мы принимаем голос; нажмите кнопку, когда закончите.");
    } catch {
      requestedStream?.getTracks().forEach((track) => track.stop());
      if (!isMountedRef.current) return;
      stopVoiceMeter();
      setQuickVoiceState("idle");
      setVoiceReceiptState("error");
      setMessage("Браузер не дал доступ к микрофону.");
    }
  }

  async function loadMode(nextMode: ListMode) {
    if (!viewModel.workspaceId) return;
    setMode(nextMode);
    const suffix = nextMode === "archived" ? "&archived=true" : nextMode === "deleted" ? "&deleted=true" : "";
    try {
      const result = await apiRequest<NotebookNoteListResponse>(`/api/v1/notebook?workspace_id=${viewModel.workspaceId}${suffix}`, { method: "GET" });
      setNotes(result.notes);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить заметки.");
    }
  }

  const isCurrentVoiceSyncing = isSyncing && (voiceReceiptState === "saved" || quickVoiceEntryIdRef.current !== null);
  const voiceStage = quickVoiceState === "requesting"
    ? { description: "Разрешите доступ, чтобы начать запись.", title: "Подключаем микрофон" }
    : quickVoiceState === "recording"
      ? { description: "Голос принимается. До остановки текущая фраза ещё не сохранена.", title: "Запись идёт" }
      : quickVoiceState === "saving"
        ? { description: "Сначала надёжно сохраняем аудио в памяти этого устройства.", title: "Сохраняем на устройстве" }
        : isSyncing
          ? isCurrentVoiceSyncing
            ? { description: "Приложение открыто и в сети: отправляем голос и ждём расшифровку.", title: "Отправляем и расшифровываем" }
            : { description: "Приложение открыто и в сети: отправляем сохранённые заметки.", title: "Отправляем сохранённые заметки" }
          : voiceReceiptState === "waiting"
            ? { description: "Откройте приложение снова при интернете — тогда запись отправится.", title: "Сохранено на устройстве" }
            : voiceReceiptState === "synced"
              ? { description: "Запись отправлена, расшифрована и добавлена в блокнот.", title: "Готово" }
              : voiceReceiptState === "saved"
                ? { description: "Локальная копия уже есть; начинаем отправку.", title: "Сохранено на устройстве" }
                : voiceReceiptState === "error"
                  ? { description: "Проверьте разрешение микрофона или повторите запись.", title: "Запись не завершена" }
                  : null;

  return (
    <div className="grid min-w-0 gap-5">
      <section className="grid gap-4 rounded-2xl border border-border bg-sidebar p-5 text-sidebar-foreground shadow-panel sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <Badge tone="success">Быстрый вход</Badge>
          <h1 className="font-editorial mt-3 text-4xl leading-tight text-white sm:text-5xl">Мысль не должна потеряться.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-sidebar-foreground/80 sm:text-base">
            Запишите или надиктуйте идею сразу. Проект, рубрика и площадка понадобятся только тогда, когда вы решите сделать из неё публикацию.
          </p>
        </div>
        <Lightbulb className="hidden text-primary lg:block" size={52} />
      </section>

      <Card className="grid gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="quick-note">Быстрая заметка</label>
          <Badge tone={isOnline && !serverUnavailable ? "success" : "warning"}>
            {isOnline && !serverUnavailable ? "связь есть" : "сохраняем на устройстве"}
          </Badge>
        </div>
        <textarea
          className="min-h-28 w-full resize-y rounded-lg border border-border bg-background p-3 text-base leading-6 outline-none focus:border-primary"
          id="quick-note"
          onChange={(event) => {
            setDraft(event.target.value);
            setDraftLocalState(event.target.value ? "saving" : "empty");
          }}
          placeholder="Напишите короткую мысль. После сохранения её можно дополнить голосом…"
          value={draft}
        />
        {voiceStage ? (
          <div className="grid gap-3 rounded-xl border border-primary/45 bg-[color-mix(in_srgb,var(--primary),transparent_94%)] p-4" data-testid="quick-voice-status" role="status">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                {quickVoiceState === "recording" ? <Circle className="fill-danger text-danger motion-safe:animate-pulse" size={13} />
                  : voiceReceiptState === "synced" ? <CheckCircle2 className="text-success" size={20} />
                    : quickVoiceState === "requesting" || quickVoiceState === "saving" || isSyncing ? <Loader2 className="animate-spin text-primary" size={20} />
                      : voiceReceiptState === "error" ? <WifiOff className="text-danger" size={20} />
                        : <HardDrive className="text-primary" size={20} />}
                {voiceStage.title}
              </div>
              {quickVoiceState === "recording" ? (
                <span aria-hidden="true" className="inline-flex items-center gap-1.5 font-mono text-lg font-semibold text-foreground"><Clock3 size={17} />{formatRecordingTime(recordingSeconds)}</span>
              ) : null}
            </div>
            <p className="text-sm leading-6 text-muted">{voiceStage.description}</p>
            {quickVoiceState === "recording" ? (
              <progress aria-hidden="true" className="h-2 w-full accent-danger" max={1} value={Math.max(voiceLevel, 0.04)} />
            ) : quickVoiceState === "requesting" || quickVoiceState === "saving" || isSyncing ? (
              <progress aria-hidden="true" className="h-2 w-full accent-primary" />
            ) : (
              <progress aria-hidden="true" className="h-2 w-full accent-primary" max={1} value={voiceReceiptState === "error" ? 0 : 1} />
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            {draftLocalState === "saving" ? <><Loader2 className="animate-spin" size={13} />Сохраняю черновик на устройстве…</>
              : draftLocalState === "saved" ? <><CheckCircle2 className="text-success" size={14} />Черновик сохранён на этом устройстве</>
                : "Текст сохраняется на этом устройстве автоматически."}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              aria-pressed={quickVoiceState === "recording"}
              className={quickVoiceState === "recording" ? "border-danger bg-danger text-white hover:bg-danger/90" : undefined}
              disabled={!viewModel.workspaceId || quickVoiceState === "saving" || quickVoiceState === "requesting"}
              onClick={() => void toggleQuickRecording()}
              type="button"
              variant="secondary"
            >
              {quickVoiceState === "recording" ? <Circle className="fill-current" size={12} /> : <Mic size={16} />} {quickVoiceState === "recording"
                ? "Остановить и сохранить"
                : quickVoiceState === "requesting"
                  ? "Подключаем микрофон…"
                : quickVoiceState === "saving"
                  ? "Сохраняю на устройстве…"
                  : "Надиктовать заметку"}
            </Button>
            <Button
              disabled={!draft.trim() || !viewModel.workspaceId || quickVoiceState !== "idle"}
              onClick={() => void createNote()}
              type="button"
            >
              <Lightbulb size={16} /> Сохранить идею
            </Button>
          </div>
        </div>
      </Card>

      {offlineEntries.length ? (
        <Card className="grid gap-4 border-primary/40 bg-[color-mix(in_srgb,var(--primary),transparent_94%)] p-4 sm:p-5" data-testid="offline-notebook-queue">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                {isOnline && !serverUnavailable ? <CloudUpload className="text-primary" size={19} /> : <HardDrive className="text-primary" size={19} />}
                Сохранено на этом устройстве: {offlineEntries.length}
              </div>
              <p className="text-sm leading-5 text-muted">
                После остановки записи текст и голос хранятся здесь до успешной отправки. На iPhone откройте приложение снова, когда появится интернет.
              </p>
            </div>
            <Button
              disabled={!isOnline || isSyncing}
              onClick={() => void synchronizeOfflineEntries()}
              type="button"
              variant="secondary"
            >
              <CloudUpload size={16} /> {isSyncing ? "Отправляю…" : "Синхронизировать"}
            </Button>
          </div>
          <div className="grid gap-2">
            {offlineEntries.map((entry) => (
              <div className="grid min-w-0 gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={entry.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    {entry.audioBlob?.size ? <Mic size={15} /> : <Lightbulb size={15} />}
                    {entry.audioBlob?.size ? "Голосовая заметка" : "Текстовая заметка"}
                    {entry.status === "syncing" ? <Badge tone="info">отправляется</Badge>
                      : entry.status === "error" ? <Badge tone="warning">не отправлено</Badge>
                        : <Badge tone={isOnline ? "neutral" : "success"}>{isOnline ? "готово к отправке" : "на устройстве"}</Badge>}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">
                    {entry.body || "Аудио расшифруется после появления связи."}
                  </p>
                  {entry.status === "syncing" ? <progress aria-label="Отправка и расшифровка заметки" className="mt-2 h-1.5 w-full accent-primary" /> : null}
                  {entry.error ? <p className="mt-1 text-xs text-warning">{entry.error}</p> : null}
                </div>
                <Button
                  disabled={isSyncing || entry.status === "syncing"}
                  onClick={async () => {
                    if (!window.confirm("Удалить эту ещё не отправленную заметку с устройства?")) return;
                    await deleteOfflineNotebookEntry(entry.id);
                    if (entry.id === quickVoiceEntryIdRef.current) {
                      quickVoiceEntryIdRef.current = null;
                      setVoiceReceiptState("none");
                    }
                    await refreshOfflineEntries();
                  }}
                  type="button"
                  variant="ghost"
                >
                  {entry.status === "syncing" ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
                  {entry.status === "syncing" ? "Отправляется…" : "Удалить"}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void loadMode("active")} variant={mode === "active" ? "primary" : "secondary"}>Заметки</Button>
          <Button onClick={() => void loadMode("archived")} variant={mode === "archived" ? "primary" : "secondary"}>Архив</Button>
          <Button onClick={() => void loadMode("deleted")} variant={mode === "deleted" ? "primary" : "secondary"}>Корзина</Button>
        </div>
        <label className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-surface px-3">
          <Search className="shrink-0 text-muted" size={16} />
          <input className="h-10 min-w-0 bg-transparent text-sm outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по заметкам" value={query} />
        </label>
      </div>

      {message ? <p aria-live="polite" className="text-sm text-muted">{message}</p> : null}
      {!isOnline || serverUnavailable ? (
        <p className="flex items-center gap-2 text-sm text-muted"><WifiOff size={16} /> История с сервера пока не обновляется. Новые заметки остаются на устройстве; откройте блокнот снова при интернете для отправки.</p>
      ) : null}
      <section className="grid gap-4">
        {visible.length && viewModel.workspaceId ? visible.map((note) => (
          <NoteCard
            contentItems={viewModel.contentItems}
            key={note.id}
            note={note}
            onChanged={(updated) => setNotes((current) => current.map((row) => row.id === updated.id ? updated : row))}
            onRemoved={(id) => setNotes((current) => current.filter((row) => row.id !== id))}
            projects={viewModel.projects}
            workspaceId={viewModel.workspaceId!}
          />
        )) : (
          <Card className="grid justify-items-start gap-2 border-dashed p-6">
            <Lightbulb className="text-muted" size={24} />
            <h2 className="font-semibold text-foreground">Здесь пока пусто</h2>
            <p className="text-sm text-muted">Первая сохранённая мысль появится здесь.</p>
          </Card>
        )}
      </section>
    </div>
  );
}
