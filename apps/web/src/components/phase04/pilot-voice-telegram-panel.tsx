"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { CheckCircle2, FileAudio, Loader2, LockKeyhole, Mic, Pause, Play, RotateCcw, Send, Upload, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HintPopover } from "@/components/layout/learning-hints";
import {
  analyzePilotDraftAction,
  assemblePilotMasterAction,
  prepareFullTelegramDraftAction,
  publishPilotTelegramAction,
} from "@/services/content-actions";
import {
  initialGuidedActionState,
  type GuidedActionState,
} from "@/services/guided-action-state";
import {
  type BlockOut,
  type ContentMediaResponse,
  type ContentItemOut,
  type MediaOut,
  type MediaPresignResponse,
  type TranscriptionJobOut,
} from "@/services/openapi-types";

type CaptureState = "idle" | "recording" | "uploading" | "transcribing" | "ready" | "accepted" | "error";
type PilotFieldKey = "address" | "atmosphere" | "conclusion" | "venue_name";

const pilotFields: Array<{ description: string; key: PilotFieldKey; label: string }> = [
  {
    description: "общее впечатление, сервис, обстановка",
    key: "atmosphere",
    label: "Атмосфера",
  },
  {
    description: "название места коротко",
    key: "venue_name",
    label: "Заведение",
  },
  {
    description: "адрес или ориентир",
    key: "address",
    label: "Адрес",
  },
  {
    description: "вывод, стоит ли идти и кому подойдёт",
    key: "conclusion",
    label: "Итоговое впечатление",
  },
];

interface PilotVoiceTelegramPanelProps {
  canMutate: boolean;
  contentId: string;
  initialTranscript: string;
  itemVersion: number | null;
  workspaceId: string | null;
}

function csrfToken(): string | null {
  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("tmh_csrf="));
  return match ? decodeURIComponent(match.slice("tmh_csrf=".length)) : null;
}

async function apiRequest<T>(
  path: string,
  options: {
    body?: unknown;
    method: "GET" | "POST" | "PUT";
  },
): Promise<T> {
  const token = csrfToken();
  if (!token) {
    throw new Error("Нет CSRF-токена. Обновите страницу и повторите.");
  }

  const response = await fetch(path, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    method: options.method,
  });

  if (!response.ok) {
    let message = `API вернул ${response.status}.`;
    try {
      const payload = await response.json() as {
        error?: {
          code?: string;
          message?: string;
        };
      };
      if (payload.error?.message) {
        message = `${payload.error.code ?? "api_error"}: ${payload.error.message}`;
      }
    } catch {
      // Keep normalized fallback.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function pilotFieldLabel(fieldKey: PilotFieldKey): string {
  return pilotFields.find((field) => field.key === fieldKey)?.label ?? fieldKey;
}

function actionToneClass(tone: GuidedActionState["tone"]): string {
  if (tone === "success") {
    return "border-success bg-[color-mix(in_srgb,var(--success),transparent_92%)]";
  }
  if (tone === "danger") {
    return "border-danger bg-[color-mix(in_srgb,var(--danger),transparent_92%)]";
  }
  if (tone === "warning") {
    return "border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)]";
  }
  return "border-border bg-surface-muted";
}

function preferredMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
  if (typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "audio/webm";
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mpeg")) {
    return "mp3";
  }
  if (mimeType.includes("mp4")) {
    return "m4a";
  }
  if (mimeType.includes("wav")) {
    return "wav";
  }
  return "webm";
}

export function PilotVoiceTelegramPanel({
  canMutate,
  contentId,
  initialTranscript,
  itemVersion,
  workspaceId,
}: PilotVoiceTelegramPanelProps) {
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [message, setMessage] = useState("Нажмите «Запись», продиктуйте факт и остановите запись.");
  const [transcript, setTranscript] = useState(initialTranscript);
  const [targetField, setTargetField] = useState<PilotFieldKey>("atmosphere");
  const [mediaStatus, setMediaStatus] = useState("Фото и видео можно прикрепить перед сборкой версий.");
  const [attachedMediaCount, setAttachedMediaCount] = useState<number | null>(null);
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const [jobTargetField, setJobTargetField] = useState<PilotFieldKey | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [analysisState, analysisAction, isAnalysisPending] = useActionState(analyzePilotDraftAction, initialGuidedActionState);
  const [fullDraftState, fullDraftAction, isFullDraftPending] = useActionState(prepareFullTelegramDraftAction, initialGuidedActionState);
  const [masterState, masterAction, isMasterPending] = useActionState(assemblePilotMasterAction, initialGuidedActionState);
  const [publishState, publishAction, isPublishPending] = useActionState(publishPilotTelegramAction, initialGuidedActionState);
  const [isAnalysisTransitionPending, startAnalysisTransition] = useTransition();
  const [isFullDraftTransitionPending, startFullDraftTransition] = useTransition();
  const [isMasterTransitionPending, startMasterTransition] = useTransition();
  const [isPublishTransitionPending, startPublishTransition] = useTransition();
  const analysisBusy = isAnalysisPending || isAnalysisTransitionPending;
  const fullDraftBusy = isFullDraftPending || isFullDraftTransitionPending;
  const masterBusy = isMasterPending || isMasterTransitionPending;
  const publishBusy = isPublishPending || isPublishTransitionPending;
  const disabled = !canMutate || !workspaceId || itemVersion === null;
  const targetLocked = captureState === "recording" || captureState === "uploading" || captureState === "transcribing" || Boolean(jobId);

  async function startRecording() {
    if (disabled) {
      setMessage("Запись доступна только для реального API-материала.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setCaptureState("error");
      setMessage("Этот браузер не дал доступ к записи. Загрузите аудиофайл кнопкой ниже.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = preferredMimeType();
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      setCaptureState("ready");
      setMessage("Запись готова. Нажмите «Загрузить и расшифровать».");
    };
    recorder.start();
    setMediaRecorder(recorder);
    setCaptureState("recording");
    setMessage("Идёт запись. Говорите обычным голосом, затем нажмите «Стоп».");
  }

  function stopRecording() {
    if (mediaRecorder?.state === "recording") {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
  }

  function resetRecording() {
    if (mediaRecorder?.state === "recording") {
      mediaRecorder.stop();
    }
    setMediaRecorder(null);
    setRecordedBlob(null);
    setJobId(null);
    setJobTargetField(null);
    setCaptureState("idle");
    setMessage("Запись сброшена. Можно продиктовать заново или загрузить файл.");
  }

  async function transcribeBlob(blob: Blob) {
    if (disabled || !workspaceId || itemVersion === null) {
      setCaptureState("error");
      setMessage("Нет workspace/version для сохранения. Обновите страницу.");
      return;
    }

    try {
      setCaptureState("uploading");
      setMessage("Загружаю аудио в S3...");
      const mimeType = blob.type || "audio/webm";
      const filename = `voice-${Date.now()}.${extensionForMimeType(mimeType)}`;
      const presign = await apiRequest<MediaPresignResponse>("/api/v1/media/presign-upload", {
        body: {
          content_item_id: contentId,
          filename,
          kind: "voice",
          mime_type: mimeType,
          size_bytes: blob.size,
          workspace_id: workspaceId,
        },
        method: "POST",
      });

      const putResponse = await fetch(presign.upload_url, {
        body: blob,
        headers: { "Content-Type": mimeType },
        method: "PUT",
      });
      if (!putResponse.ok) {
        throw new Error(`S3 отклонил загрузку: ${putResponse.status}.`);
      }

      await apiRequest<MediaOut>(`/api/v1/media/${presign.media_id}/complete-upload`, {
        body: {
          codec_metadata: { source: "content-studio-ui" },
          size_bytes: blob.size,
        },
        method: "POST",
      });

      const currentItem = await apiRequest<ContentItemOut>(`/api/v1/content-items/${contentId}`, {
        method: "GET",
      });
      const fieldLabel = pilotFieldLabel(targetField);
      const block = await apiRequest<BlockOut>(`/api/v1/content-items/${contentId}/blocks/${targetField}`, {
        body: {
          source_media_id: presign.media_id,
          source_type: "voice",
          value: "",
          version: currentItem.version,
        },
        method: "PUT",
      });

      setCaptureState("transcribing");
      setMessage(`Расшифровываю голос для поля «${fieldLabel}» через OpenAI STT...`);
      const job = await apiRequest<TranscriptionJobOut>(`/api/v1/content-blocks/${block.id}/transcribe`, {
        body: {
          media_id: presign.media_id,
          provider_key: "openai",
        },
        method: "POST",
      });
      setJobId(job.id);
      setJobTargetField(targetField);
      setTranscript(job.transcript_text);
      setCaptureState("ready");
      setMessage(`Текст для поля «${fieldLabel}» готов. Проверьте его и нажмите «Принять текст».`);
    } catch (error) {
      setCaptureState("error");
      setMessage(error instanceof Error ? error.message : "Не удалось расшифровать запись.");
    }
  }

  async function uploadPilotMedia(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []).filter((file) => (
      file.type.startsWith("image/") || file.type.startsWith("video/")
    ));
    if (!selectedFiles.length) {
      setMediaStatus("Выберите фото или видеофайлы.");
      return;
    }
    if (disabled || !workspaceId) {
      setMediaStatus("Загрузка медиа доступна только для реального API-материала.");
      return;
    }

    try {
      setIsMediaUploading(true);
      setMediaStatus(`Загружаю медиа: 0 из ${selectedFiles.length}.`);
      const existing = await apiRequest<ContentMediaResponse>(`/api/v1/content-items/${contentId}/media`, {
        method: "GET",
      });
      const uploadedIds: string[] = [];
      for (const [index, file] of selectedFiles.entries()) {
        const kind = file.type.startsWith("video/") ? "video" : "image";
        const presign = await apiRequest<MediaPresignResponse>("/api/v1/media/presign-upload", {
          body: {
            content_item_id: contentId,
            filename: file.name || `media-${Date.now()}-${index}`,
            kind,
            mime_type: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
            size_bytes: file.size,
            workspace_id: workspaceId,
          },
          method: "POST",
        });
        const uploadResponse = await fetch(presign.upload_url, {
          body: file,
          headers: { "Content-Type": file.type || presign.headers["Content-Type"] || "application/octet-stream" },
          method: "PUT",
        });
        if (!uploadResponse.ok) {
          throw new Error(`S3 отклонил файл «${file.name}»: ${uploadResponse.status}.`);
        }
        await apiRequest<MediaOut>(`/api/v1/media/${presign.media_id}/complete-upload`, {
          body: {
            codec_metadata: { source: "content-studio-ui", original_name: file.name },
            size_bytes: file.size,
          },
          method: "POST",
        });
        uploadedIds.push(presign.media_id);
        setMediaStatus(`Загружаю медиа: ${index + 1} из ${selectedFiles.length}.`);
      }

      const currentItem = await apiRequest<ContentItemOut>(`/api/v1/content-items/${contentId}`, {
        method: "GET",
      });
      const media = [
        ...existing.media.map((item, index) => ({
          caption: item.caption,
          media_id: item.media_asset_id,
          role: item.role,
          sort_order: index,
        })),
        ...uploadedIds.map((mediaId, index) => ({
          media_id: mediaId,
          role: "gallery",
          sort_order: existing.media.length + index,
        })),
      ];
      const attached = await apiRequest<ContentMediaResponse>(`/api/v1/content-items/${contentId}/media-order`, {
        body: {
          media,
          version: currentItem.version,
        },
        method: "PUT",
      });
      setAttachedMediaCount(attached.media.length);
      setMediaStatus(`Медиа прикреплены: ${attached.media.length}. Теперь подготовьте версии заново.`);
    } catch (error) {
      setMediaStatus(error instanceof Error ? error.message : "Не удалось загрузить медиа.");
    } finally {
      setIsMediaUploading(false);
    }
  }

  async function acceptTranscript() {
    if (!jobId || !transcript.trim()) {
      setMessage("Сначала нужна расшифровка с текстом.");
      return;
    }
    try {
      await apiRequest<BlockOut>(`/api/v1/transcription-jobs/${jobId}/accept`, {
        body: {
          corrected_text: transcript,
          lock: true,
        },
        method: "POST",
      });
      const fieldLabel = pilotFieldLabel(jobTargetField ?? targetField);
      setCaptureState("accepted");
      setRecordedBlob(null);
      setJobId(null);
      setJobTargetField(null);
      setMessage(`Текст принят и зафиксирован в поле «${fieldLabel}». Можно заполнить следующее поле или собрать мастер-текст.`);
    } catch (error) {
      setCaptureState("error");
      setMessage(error instanceof Error ? error.message : "Не удалось принять текст.");
    }
  }

  function submitAction(action: (formData: FormData) => void) {
    const formData = new FormData();
    formData.set("contentId", contentId);
    action(formData);
  }

  return (
    <div className="grid gap-3" data-testid="material-capture-panel">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Mic size={18} className="text-primary" />
        Сбор материала
        <HintPopover
          body="Это основной блок сбора: сюда надиктовываются факты, прикрепляются медиа, затем материал передаётся на ИИ-сборку и версии площадок."
          storageKey="tmh-learning-content-studio"
          title="Сбор материала"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone={disabled ? "neutral" : "success"}>
          {disabled ? "только просмотр" : "API-сценарий включён"}
        </Badge>
        <Badge tone={captureState === "error" ? "danger" : captureState === "accepted" ? "success" : "info"}>
          {captureState === "idle" ? "ожидает" : captureState}
        </Badge>
      </div>
      <div className="rounded-md border border-border bg-surface-muted p-3 text-sm leading-6 text-muted">
        {message}
      </div>
      <label className="grid gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          Куда сохранить следующую диктовку
          <HintPopover
            body="Выберите, какой факт вы сейчас диктуете: атмосферу, название, адрес или итог. Так ИИ понимает структуру будущего материала."
            storageKey="tmh-learning-content-studio"
            title="Поле диктовки"
          />
        </span>
        <select
          className="min-h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
          disabled={disabled || targetLocked}
          value={targetField}
          onChange={(event) => {
            const nextField = event.currentTarget.value as PilotFieldKey;
            setTargetField(nextField);
            setMessage(`Следующая запись будет сохранена в поле «${pilotFieldLabel(nextField)}».`);
          }}
        >
          {pilotFields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label} — {field.description}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <Button disabled={disabled || captureState === "recording"} size="sm" type="button" onClick={startRecording}>
          <Play size={14} />
          Запись
        </Button>
        <Button disabled={captureState !== "recording"} size="sm" type="button" variant="secondary" onClick={stopRecording}>
          <Pause size={14} />
          Стоп
        </Button>
        <Button size="sm" type="button" variant="secondary" onClick={resetRecording}>
          <RotateCcw size={14} />
          Заново
        </Button>
      </div>
      <div className="flex items-start gap-2 rounded-md bg-surface-muted p-3 text-xs leading-5 text-muted">
        <HintPopover
          body="На телефоне браузер спросит разрешение на микрофон. После диктовки нажмите «Стоп», потом «Загрузить и расшифровать»."
          storageKey="tmh-learning-content-studio"
          title="Как записывать"
        />
        <span>Сначала запись, потом расшифровка, затем проверка текста и принятие.</span>
      </div>
      <label className="grid gap-2 rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <FileAudio size={16} className="text-primary" />
          Загрузить аудиофайл вместо записи
        </span>
        <input
          accept="audio/*"
          disabled={disabled || captureState === "recording" || captureState === "uploading" || captureState === "transcribing"}
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) {
              return;
            }
            setRecordedBlob(file);
            setCaptureState("ready");
            setMessage("Файл выбран. Нажмите «Загрузить и расшифровать».");
          }}
        />
      </label>
      <Button
        disabled={!recordedBlob || disabled || captureState === "uploading" || captureState === "transcribing"}
        type="button"
        onClick={() => recordedBlob ? void transcribeBlob(recordedBlob) : undefined}
      >
        {captureState === "uploading" || captureState === "transcribing" ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
        Загрузить и расшифровать
      </Button>
      <textarea
        className="min-h-32 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
        placeholder="После расшифровки текст появится здесь. Его можно поправить перед принятием."
        value={transcript}
        onChange={(event) => setTranscript(event.target.value)}
      />
      <Button disabled={!jobId || !transcript.trim() || disabled} type="button" onClick={acceptTranscript}>
        <LockKeyhole size={16} />
        Принять текст
      </Button>
      <div className="grid gap-2 rounded-md border border-border p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          Медиа материала
          <HintPopover
            body="Выберите фото или видео с телефона. Файлы прикрепятся к материалу и попадут в версии площадок после новой сборки."
            storageKey="tmh-learning-content-studio"
            title="Фото и видео"
          />
        </div>
        <label className="grid gap-2 rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Upload size={16} className="text-primary" />
            Прикрепить фото или видео
          </span>
          <input
            accept="image/*,video/*"
            disabled={disabled || isMediaUploading}
            multiple
            type="file"
            onChange={(event) => {
              void uploadPilotMedia(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <div className={`rounded-md border p-3 text-sm leading-6 text-muted ${actionToneClass(isMediaUploading ? "warning" : "idle")}`}>
          {isMediaUploading ? <Loader2 className="mr-2 inline animate-spin" size={14} /> : null}
          {mediaStatus}
          {attachedMediaCount !== null ? ` Всего в материале: ${attachedMediaCount}.` : ""}
        </div>
      </div>
      <div className="grid gap-2 rounded-md border border-border p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          ИИ-сборка и версии
          <HintPopover
            body="Здесь ИИ собирает мастер-материал из диктовки, фактов и медиа, а затем готовит первую платформенную версию."
            storageKey="tmh-learning-content-studio"
            title="ИИ-сборка и версии"
          />
        </div>
        <div className={`rounded-md border p-3 text-sm leading-6 text-muted ${actionToneClass(analysisState.tone)}`}>
          {analysisState.message}
        </div>
        <Button
          disabled={disabled || analysisBusy}
          type="button"
          variant="secondary"
          onClick={() => startAnalysisTransition(() => submitAction(analysisAction))}
        >
          {analysisBusy ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}
          ИИ-разбор материала
        </Button>
        <div className={`rounded-md border p-3 text-sm leading-6 text-muted ${actionToneClass(fullDraftState.tone)}`}>
          {fullDraftState.message}
        </div>
        <Button
          disabled={disabled || fullDraftBusy}
          type="button"
          onClick={() => startFullDraftTransition(() => submitAction(fullDraftAction))}
        >
          {fullDraftBusy ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}
          Собрать мастер и первую версию
        </Button>
        <div className={`rounded-md border p-3 text-sm leading-6 text-muted ${actionToneClass(masterState.tone)}`}>
          {masterState.message}
        </div>
        <Button
          disabled={disabled || masterBusy}
          type="button"
          variant="secondary"
          onClick={() => startMasterTransition(() => submitAction(masterAction))}
        >
          {masterBusy ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}
          Собрать мастер-текст
        </Button>
      </div>
      <div className="grid gap-2 rounded-md border border-border p-3" data-testid="telegram-output-block">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          Площадка: Telegram
          <HintPopover
            body="Telegram остаётся первой подключённой площадкой. Отправка запускается отдельно после проверки версии."
            storageKey="tmh-learning-content-studio"
            title="Площадка Telegram"
          />
        </div>
        <div className={`rounded-md border p-3 text-sm leading-6 text-muted ${actionToneClass(publishState.tone)}`}>
          {publishState.message}
        </div>
        <Button
          disabled={disabled || publishBusy}
          type="button"
          onClick={() => startPublishTransition(() => submitAction(publishAction))}
        >
          {publishBusy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Опубликовать в тестовый Telegram
        </Button>
        <div className="flex items-start gap-2 rounded-md bg-surface-muted p-3 text-xs leading-5 text-muted">
          <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={14} />
          <span>Публикация идёт только в канал @temichev_posthub_test через подтверждённый серверный коннектор.</span>
        </div>
      </div>
    </div>
  );
}
