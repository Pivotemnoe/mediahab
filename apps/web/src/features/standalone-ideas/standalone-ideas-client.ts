import type {
  GenerationRunOut,
  IdeaCapabilityOut,
  MediaOut,
  MediaPresignResponse,
  StandaloneIdeaGenerateRequest,
  StandaloneIdeaTopicOut,
  StandaloneIdeaTopicTranscribeRequest,
} from "@/services/openapi-types";
import { standaloneIdeaFromApi, type StandaloneIdeaDirection } from "@/features/standalone-ideas/idea-handoff";

export type StandaloneIdeaCapability = IdeaCapabilityOut;
export type StandaloneIdeaRun = GenerationRunOut;

type RequestOptions = {
  body?: unknown;
  errorScope?: "ideas" | "voice";
  method: "GET" | "POST";
  signal?: AbortSignal;
};

const ideaErrors: Record<string, string> = {
  ai_text_generation_not_included: "В этом кабинете подбор идей пока недоступен.",
  duplicate_ideas: "Идеи получились слишком похожими. Попробуй ещё раз.",
  idea_daily_limit_reached: "Подборки на сегодня закончились. Новые будут доступны завтра.",
  idea_generator_unavailable: "Генератор идей сейчас недоступен.",
  limit_exceeded: "В этом месяце все подборки идей уже использованы.",
  role_denied: "У тебя нет доступа к подбору идей.",
  subscription_inactive: "Для идей нужна активная подписка.",
  unsafe_idea_output: "Не получилось подготовить идеи по этой теме. Опиши её немного иначе.",
};

const voiceErrors: Record<string, string> = {
  ai_transcription_not_included: "В этом кабинете расшифровка голоса пока недоступна.",
  idea_topic_audio_duration_invalid: "Запись темы должна длиться не больше двух минут.",
  idea_topic_audio_size_invalid: "Запись темы слишком большая. Запиши одну короткую тему.",
  limit_exceeded: "В этом месяце все доступные расшифровки уже использованы.",
  openai_empty_transcript: "Голос не удалось распознать. Напиши тему или запиши её ещё раз.",
  openai_invalid_response: "Не удалось расшифровать голос. Повтори запись чуть позже.",
  openai_not_configured: "Расшифровка голоса сейчас не настроена.",
  openai_request_failed: "Сервис расшифровки не ответил. Повтори запись чуть позже.",
  empty_audio: "Запись получилась пустой — звук не сохранился. Запиши тему ещё раз.",
  transcription_temporarily_unavailable: "Не удалось расшифровать сохранённую запись. Попробуй позже или напиши тему вручную.",
  standalone_idea_generator_unavailable: "Генератор идей сейчас недоступен для этого кабинета.",
  standalone_idea_topic_already_transcribed: "Эта запись уже была отправлена на расшифровку.",
  standalone_idea_topic_empty: "Голос не удалось распознать. Напиши тему или запиши её ещё раз.",
  standalone_idea_topic_too_long: "Тема получилась слишком длинной. Оставь одну короткую фразу.",
  stt_provider_unavailable: "Расшифровка голоса сейчас недоступна.",
  subscription_inactive: "Для расшифровки голоса нужна активная подписка.",
};

function csrfToken(): string | null {
  const match = document.cookie.split("; ").find((cookie) => cookie.startsWith("tmh_csrf="));
  return match ? decodeURIComponent(match.slice("tmh_csrf=".length)) : null;
}

async function parseApiError(response: Response, scope: RequestOptions["errorScope"]): Promise<Error> {
  let code: string | null = null;
  try {
    const payload = await response.json() as { error?: { code?: string; message?: string } };
    code = payload.error?.code ?? null;
  } catch {
    // Use the normalized fallback below.
  }
  if (code && scope === "voice" && voiceErrors[code]) return new Error(voiceErrors[code]);
  if (code && ideaErrors[code]) return new Error(ideaErrors[code]);
  if (response.status === 401 || response.status === 403) return new Error("Нужно войти заново. Обнови страницу и повтори вход.");
  if (response.status === 429) return new Error("Сейчас слишком много запросов. Подожди немного.");
  return new Error("Не получилось выполнить действие. Попробуй ещё раз чуть позже.");
}

async function apiRequest<T>(path: string, options: RequestOptions): Promise<T> {
  const token = csrfToken();
  if (options.method === "POST" && !token) {
    throw new Error("Не получилось подтвердить вход. Обнови страницу и войди ещё раз.");
  }
  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("X-CSRF-Token", token);
  const response = await fetch(path, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers,
    method: options.method,
    signal: options.signal,
  });
  if (!response.ok) throw await parseApiError(response, options.errorScope);
  return response.json() as Promise<T>;
}

export async function getStandaloneIdeaCapability(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<StandaloneIdeaCapability> {
  return apiRequest(`/api/v1/workspaces/${workspaceId}/ideas/capability`, { method: "GET", signal });
}

export async function generateStandaloneIdeas({
  signal,
  topic,
  workspaceId,
}: {
  signal?: AbortSignal;
  topic: string;
  workspaceId: string;
}): Promise<{ ideas: StandaloneIdeaDirection[]; run: StandaloneIdeaRun }> {
  const body: StandaloneIdeaGenerateRequest = { topic };
  const run = await apiRequest<StandaloneIdeaRun>(`/api/v1/workspaces/${workspaceId}/ideas/generate`, {
    body,
    method: "POST",
    signal,
  });
  const rawIdeas = run.response_json?.ideas;
  const ideas = Array.isArray(rawIdeas) ? rawIdeas.map(standaloneIdeaFromApi) : [];
  if (run.status !== "completed" || ideas.length !== 5 || ideas.some((idea) => idea === null)) {
    throw new Error((run.error_code && ideaErrors[run.error_code]) || "Не получилось подготовить пять разных идей. Попробуй ещё раз.");
  }
  return { ideas: ideas as StandaloneIdeaDirection[], run };
}

function preferredMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? null;
}

export function createVoiceRecorder(stream: MediaStream): MediaRecorder {
  const mimeType = preferredMimeType();
  return mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export async function transcribeStandaloneIdeaTopic({
  blob,
  durationMs,
  onStage,
  signal,
  workspaceId,
}: {
  blob: Blob;
  durationMs: number;
  onStage?: (stage: "transcribing" | "uploading") => void;
  signal?: AbortSignal;
  workspaceId: string;
}): Promise<string> {
  onStage?.("uploading");
  const mimeType = blob.type || "audio/webm";
  const presign = await apiRequest<MediaPresignResponse>("/api/v1/media/presign-upload", {
    body: {
      content_item_id: null,
      filename: `idea-topic-${Date.now()}.${extensionForMimeType(mimeType)}`,
      kind: "voice",
      mime_type: mimeType,
      size_bytes: blob.size,
      workspace_id: workspaceId,
    },
    errorScope: "voice",
    method: "POST",
    signal,
  });
  const upload = await fetch(presign.upload_url, {
    body: blob,
    headers: { "Content-Type": mimeType },
    method: "PUT",
    signal,
  });
  if (!upload.ok) throw new Error("Не удалось загрузить голос. Повтори запись.");
  await apiRequest<MediaOut>(`/api/v1/media/${presign.media_id}/complete-upload`, {
    body: { codec_metadata: { source: "standalone-idea-topic" }, duration_ms: durationMs, size_bytes: blob.size },
    errorScope: "voice",
    method: "POST",
    signal,
  });
  onStage?.("transcribing");
  const body: StandaloneIdeaTopicTranscribeRequest = { media_id: presign.media_id };
  const transcription = await apiRequest<StandaloneIdeaTopicOut>(
    `/api/v1/workspaces/${workspaceId}/ideas/transcribe-topic`,
    { body, errorScope: "voice", method: "POST", signal },
  );
  const transcript = transcription.transcript_text?.trim();
  if (!transcript) throw new Error("Голос не удалось распознать. Напиши тему или запиши её ещё раз.");
  return transcript;
}
