"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Clipboard,
  FilePlus2,
  Lightbulb,
  Mic,
  Pin,
  PinOff,
  RotateCcw,
  Search,
  Trash2,
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

type SaveState = "idle" | "offline" | "saved" | "saving" | "error";
type ListMode = "active" | "archived" | "deleted";

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
      const run = await apiRequest<NotebookTranscriptionOut>(`/api/v1/notebook/${note.id}/transcribe`, {
        body: { media_id: presign.media_id, provider_key: "default" },
        method: "POST",
      });
      const updated = await apiRequest<NotebookNoteOut>(`/api/v1/notebook-transcriptions/${run.id}/accept`, {
        body: {
          append: true,
          corrected_text: run.transcript_text || "",
          note_version: currentRef.current.version,
        },
        method: "POST",
      });
      currentRef.current = updated;
      setBody(updated.body);
      onChanged(updated);
      setMessage("Голос расшифрован и добавлен в заметку.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось расшифровать голос.");
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
          <span className="text-xs text-muted">
            {new Intl.DateTimeFormat("ru-RU", { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" }).format(new Date(note.updated_at))}
          </span>
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
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ListMode>("active");
  const [message, setMessage] = useState(viewModel.notice ?? "");
  const draftKey = viewModel.workspaceId ? `tmh:notebook:${viewModel.workspaceId}:new` : "";

  useEffect(() => {
    if (!draftKey) return;
    setDraft(window.localStorage.getItem(draftKey) ?? "");
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    if (draft) window.localStorage.setItem(draftKey, draft);
    else window.localStorage.removeItem(draftKey);
  }, [draft, draftKey]);

  const visible = useMemo(
    () => notes.filter((note) => note.body.toLocaleLowerCase("ru").includes(query.toLocaleLowerCase("ru"))),
    [notes, query],
  );

  async function createNote() {
    if (!viewModel.workspaceId || !draft.trim()) return;
    try {
      const note = await apiRequest<NotebookNoteOut>("/api/v1/notebook", {
        body: { body: draft.trim(), kind: "idea", workspace_id: viewModel.workspaceId },
        method: "POST",
      });
      setNotes((current) => [note, ...current]);
      setDraft("");
      setMessage("Заметка сохранена. Проект и рубрика не требовались.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить заметку.");
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

  return (
    <div className="grid min-w-0 gap-5">
      <section className="grid gap-4 rounded-2xl bg-sidebar p-5 text-sidebar-foreground shadow-panel sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <Badge tone="success">Быстрый вход</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Блокнот</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-sidebar-foreground/80 sm:text-base">
            Сохраните мысль сразу. Проект, рубрика, площадка и ИИ понадобятся только позже.
          </p>
        </div>
        <Lightbulb className="hidden text-primary lg:block" size={52} />
      </section>

      <Card className="grid gap-3 p-4 sm:p-5">
        <label className="text-sm font-semibold text-foreground" htmlFor="quick-note">Новая заметка</label>
        <textarea
          className="min-h-28 w-full resize-y rounded-lg border border-border bg-background p-3 text-base leading-6 outline-none focus:border-primary"
          id="quick-note"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Напишите идею — она останется на этом устройстве даже до отправки…"
          value={draft}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted">Черновик восстанавливается на этом устройстве.</span>
          <Button disabled={!draft.trim() || !viewModel.workspaceId} onClick={() => void createNote()} type="button">
            <Lightbulb size={16} /> Сохранить идею
          </Button>
        </div>
      </Card>

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
