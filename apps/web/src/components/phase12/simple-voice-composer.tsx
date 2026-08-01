"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  FileText,
  Images,
  Loader2,
  Mic,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RichTextEditor, RichTextPreview } from "@/components/phase12/rich-text-editor";
import {
  type RichTextDocument,
  copyRichText,
  plainRichText,
  richTextFromPayload,
  richTextPlain,
} from "@/lib/rich-text";
import {
  type BlockOut,
  type ContentItemOut,
  type ContentMediaResponse,
  type GenerationRunOut,
  type GuidedFormResponse,
  type GuidedFormUiField,
  type MediaOut,
  type MediaPresignResponse,
  type PlatformVariantOut,
  type PlatformVariantFeedbackOut,
  type PlatformVariantFeedbackResponse,
  type PlatformVariantsResponse,
  type TranscriptionJobOut,
} from "@/services/openapi-types";
import { type NewContentViewModel } from "@/services/content";

type CaptureState =
  | "idle"
  | "recording"
  | "paused"
  | "uploading"
  | "transcribing"
  | "review"
  | "accepted"
  | "error";

type PlatformKey = "instagram" | "max" | "telegram" | "vk";
type LengthMode = "auto" | "short" | "normal" | "detailed" | "exact";
type LengthTarget = { min_chars: number | null; max_chars: number | null };
type InstagramFormat = "image" | "carousel" | "reel";
type PreflightStatus = "pass" | "warning" | "block";

type PreflightCheck = {
  code: string;
  key: "length" | "media" | "format" | "delivery";
  label: string;
  message: string;
  status: PreflightStatus;
};

type VariantPreflight = {
  checks: PreflightCheck[];
  status: PreflightStatus;
};

type Segment = {
  id: string;
  label: string;
  status: "готов" | "проверить" | "принят";
  transcript: string;
};

type PlatformResult = {
  error?: string;
  status: "idle" | "loading" | "ready" | "error";
  variant?: PlatformVariantOut;
};

type PlatformVariantRefinementResponse = {
  cost_estimate_micro_usd: number | null;
  generation_run_id: string;
  input_characters: number | null;
  input_tokens: number | null;
  model_id: string;
  output_characters: number | null;
  output_tokens: number | null;
  variant: PlatformVariantOut;
  warnings: string[];
};

type AiUsageSummary = {
  costComplete: boolean;
  costMicroUsd: number;
  estimatedTokens: boolean;
  inputTokens: number;
  outputTokens: number;
};

const platformOptions: Array<{
  hardLimit: number | null;
  key: PlatformKey;
  label: string;
  note: string;
}> = [
  { hardLimit: 32768, key: "telegram", label: "Telegram", note: "длинный пост" },
  { hardLimit: 4000, key: "max", label: "MAX", note: "до 4 000" },
  { hardLimit: null, key: "vk", label: "VK", note: "Запись сообщества" },
  { hardLimit: 2200, key: "instagram", label: "Instagram", note: "подпись" },
];

const lengthProfiles: Record<Exclude<LengthMode, "auto" | "exact">, Record<PlatformKey, LengthTarget>> = {
  short: {
    telegram: { min_chars: 700, max_chars: 1200 }, max: { min_chars: 700, max_chars: 1200 },
    vk: { min_chars: 700, max_chars: 1200 }, instagram: { min_chars: 500, max_chars: 900 },
  },
  normal: {
    telegram: { min_chars: 1800, max_chars: 2500 }, max: { min_chars: 1800, max_chars: 2500 },
    vk: { min_chars: 1800, max_chars: 2500 }, instagram: { min_chars: 1000, max_chars: 1800 },
  },
  detailed: {
    telegram: { min_chars: 2800, max_chars: 3600 }, max: { min_chars: 2800, max_chars: 3600 },
    vk: { min_chars: 2800, max_chars: 3600 }, instagram: { min_chars: 1800, max_chars: 2200 },
  },
};

function lengthTargetFromVariant(variant: PlatformVariantOut | undefined): (LengthTarget & { source?: string }) | null {
  const value = variant?.payload.length_target;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const target = value as Record<string, unknown>;
  return {
    max_chars: typeof target.max_chars === "number" ? target.max_chars : null,
    min_chars: typeof target.min_chars === "number" ? target.min_chars : null,
    source: typeof target.source === "string" ? target.source : undefined,
  };
}

function targetSourceLabel(source: string | undefined): string {
  return ({ post: "этот пост", rubric: "рубрика", project: "проект", system: "авто" } as Record<string, string>)[source ?? ""] ?? "авто";
}

function variantBodyLength(variant: PlatformVariantOut): number {
  const body = variant.payload.body_text;
  return typeof body === "string" ? body.length : variant.character_count;
}

function missesLengthTarget(variant: PlatformVariantOut): boolean {
  const target = lengthTargetFromVariant(variant);
  if (!target || target.source === "system") return false;
  const count = variantBodyLength(variant);
  return Boolean(
    (target.min_chars !== null && count < target.min_chars)
    || (target.max_chars !== null && count > target.max_chars),
  );
}

function lengthRefinementInstruction(variant: PlatformVariantOut): string {
  const target = lengthTargetFromVariant(variant);
  const minChars = target?.min_chars ?? 1;
  const maxChars = target?.max_chars ?? target?.min_chars ?? variant.character_count;
  return `Пересобери основной текст специально для этой площадки в диапазоне ${minChars}–${maxChars} знаков. Сохрани факты, цену, адрес, оценки и вывод автора. Не обрезай хвост механически, не добавляй фактов и не добавляй постоянный подвал — приложение вернёт его само.`;
}

function instagramFormatInstruction(format: InstagramFormat, variant: PlatformVariantOut): string {
  const target = lengthTargetFromVariant(variant);
  const minChars = target?.min_chars ?? 1000;
  const maxChars = target?.max_chars ?? 1800;
  const shared = `Напиши отдельную цельную версию специально для Instagram в диапазоне ${minChars}–${maxChars} знаков основного текста. Пересобери композицию по полному исходнику: выбери главное, сохрани факты и авторский вывод. Не обрезай готовый текст, не используй фразы «Сокращённая версия для INSTAGRAM» и «[сокращено под лимит площадки]».`;
  if (format === "carousel") {
    return `${shared} Подготовь результат для карусели Instagram. Сначала дай готовую общую подпись к публикации, затем отдельный раздел «Карточки карусели» с коротким планом для каждого прикреплённого медиа по порядку. Не выдумывай факты и не добавляй постоянный подвал — приложение вернёт его само.`;
  }
  if (format === "reel") {
    return `${shared} Подготовь результат для Reel Instagram: короткий хук, сценарий речи или титров по шагам, подпись к ролику и короткую фразу для обложки. Используй только факты исходника и не добавляй постоянный подвал — приложение вернёт его само.`;
  }
  return `${shared} Подготовь подпись для одной публикации Instagram с прикреплённым медиа. Сохрани естественный тон и не добавляй постоянный подвал — приложение вернёт его само.`;
}

function hasMechanicalPlatformTruncation(variant: PlatformVariantOut): boolean {
  const text = variantText(variant);
  const body = typeof variant.payload.body_text === "string" ? variant.payload.body_text : "";
  return text.includes("[сокращено под лимит площадки]")
    || body.includes("[сокращено под лимит площадки]")
    || body.startsWith("Сокращённая версия для INSTAGRAM:");
}

function usageSummary({
  costMicroUsd,
  inputCharacters,
  inputTokens,
  outputCharacters,
  outputTokens,
}: {
  costMicroUsd: number | null;
  inputCharacters: number | null;
  inputTokens: number | null;
  outputCharacters: number | null;
  outputTokens: number | null;
}): AiUsageSummary | null {
  const hasInput = inputTokens !== null || inputCharacters !== null;
  const hasOutput = outputTokens !== null || outputCharacters !== null;
  if (!hasInput && !hasOutput && costMicroUsd === null) return null;
  return {
    costComplete: costMicroUsd !== null,
    costMicroUsd: costMicroUsd ?? 0,
    estimatedTokens: (inputTokens === null && inputCharacters !== null) || (outputTokens === null && outputCharacters !== null),
    inputTokens: inputTokens ?? Math.ceil((inputCharacters ?? 0) / 4),
    outputTokens: outputTokens ?? Math.ceil((outputCharacters ?? 0) / 4),
  };
}

function mergeUsage(parts: Array<AiUsageSummary | null>): AiUsageSummary | null {
  const known = parts.filter((part): part is AiUsageSummary => part !== null);
  if (!known.length) return null;
  return known.reduce<AiUsageSummary>((total, part) => ({
    costComplete: total.costComplete && part.costComplete,
    costMicroUsd: total.costMicroUsd + part.costMicroUsd,
    estimatedTokens: total.estimatedTokens || part.estimatedTokens,
    inputTokens: total.inputTokens + part.inputTokens,
    outputTokens: total.outputTokens + part.outputTokens,
  }), {
    costComplete: true,
    costMicroUsd: 0,
    estimatedTokens: false,
    inputTokens: 0,
    outputTokens: 0,
  });
}

function generationRunUsage(run: GenerationRunOut): AiUsageSummary | null {
  return usageSummary({
    costMicroUsd: run.cost_estimate_micro_usd,
    inputCharacters: run.input_characters,
    inputTokens: run.input_tokens,
    outputCharacters: run.output_characters,
    outputTokens: run.output_tokens,
  });
}

function refinementUsage(run: PlatformVariantRefinementResponse): AiUsageSummary | null {
  return usageSummary({
    costMicroUsd: run.cost_estimate_micro_usd,
    inputCharacters: run.input_characters,
    inputTokens: run.input_tokens,
    outputCharacters: run.output_characters,
    outputTokens: run.output_tokens,
  });
}

function emptyResults(): Record<PlatformKey, PlatformResult> {
  return Object.fromEntries(
    platformOptions.map((platform) => [platform.key, { status: "idle" }]),
  ) as Record<PlatformKey, PlatformResult>;
}

function csrfToken(): string | null {
  const match = document.cookie.split("; ").find((cookie) => cookie.startsWith("tmh_csrf="));
  return match ? decodeURIComponent(match.slice("tmh_csrf=".length)) : null;
}

async function apiRequest<T>(
  path: string,
  options: {
    body?: unknown;
    method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  },
): Promise<T> {
  const token = csrfToken();
  if (!token) {
    throw new Error("Сессия страницы устарела. Обновите страницу и войдите заново.");
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
    let message = `Сервер вернул ошибку ${response.status}.`;
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      message = payload.error?.message || message;
    } catch {
      // Keep the normalized fallback.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function preferredMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
  if (typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "audio/webm";
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

function flattenFields(fields: GuidedFormUiField[]): GuidedFormUiField[] {
  return fields.flatMap((field) => [field, ...flattenFields(field.fields ?? [])]);
}

function sourceFieldKey(guidedForm: GuidedFormResponse): string {
  const fields = flattenFields(guidedForm.ui_schema.fields ?? []);
  const preferred = fields.find((field) =>
    ["voice", "voice_or_long_text", "long_text", "text"].includes(field.type),
  );
  return preferred?.key ?? fields[0]?.key ?? "source";
}

function platformLabel(key: PlatformKey): string {
  return platformOptions.find((platform) => platform.key === key)?.label ?? key;
}

function retentionDateLabel(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function isPlatformKey(value: string): value is PlatformKey {
  return platformOptions.some((platform) => platform.key === value);
}

function variantText(variant?: PlatformVariantOut): string {
  return variant?.rendered_text || variant?.text || "";
}

function resultHardLimit(
  key: PlatformKey,
  variant: PlatformVariantOut | undefined,
  fallback: number | null,
): number | null {
  if (key === "vk") return null;
  const hardLimits = variant?.payload.hard_limits;
  if (!hardLimits || typeof hardLimits !== "object" || Array.isArray(hardLimits)) return fallback;
  const values = Object.values(hardLimits).filter((value): value is number => typeof value === "number");
  return values[0] ?? fallback;
}

function vkExportPackage(variant: PlatformVariantOut | undefined): Record<string, unknown> | null {
  const value = variant?.payload.vk_export_package;
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function vkAttachmentSummary(variant: PlatformVariantOut | undefined): string[] {
  const attachments = vkExportPackage(variant)?.attachments;
  if (!Array.isArray(attachments)) return [];
  return attachments.flatMap((attachment, index) => {
    if (!attachment || typeof attachment !== "object" || Array.isArray(attachment)) return [];
    const kind = (attachment as Record<string, unknown>).kind;
    return [`${index + 1}. ${kind === "video" ? "Видео" : "Фото"}`];
  });
}

function variantPreflight(variant: PlatformVariantOut): VariantPreflight | null {
  const value = variant.validation.preflight;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.checks)) return null;
  const validStatuses = new Set<PreflightStatus>(["pass", "warning", "block"]);
  const validKeys = new Set<PreflightCheck["key"]>(["length", "media", "format", "delivery"]);
  const checks = record.checks.flatMap((item): PreflightCheck[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const check = item as Record<string, unknown>;
    if (
      typeof check.code !== "string"
      || typeof check.key !== "string"
      || !validKeys.has(check.key as PreflightCheck["key"])
      || typeof check.label !== "string"
      || typeof check.message !== "string"
      || typeof check.status !== "string"
      || !validStatuses.has(check.status as PreflightStatus)
    ) return [];
    return [{
      code: check.code,
      key: check.key as PreflightCheck["key"],
      label: check.label,
      message: check.message,
      status: check.status as PreflightStatus,
    }];
  });
  const status = record.status;
  if (checks.length !== 4 || typeof status !== "string" || !validStatuses.has(status as PreflightStatus)) {
    return null;
  }
  return { checks, status: status as PreflightStatus };
}

function preflightStatusLabel(status: PreflightStatus): string {
  return ({ pass: "Готово", warning: "Проверить", block: "Исправить" } as const)[status];
}

function preflightStatusTone(status: PreflightStatus): "danger" | "success" | "warning" {
  return ({ pass: "success", warning: "warning", block: "danger" } as const)[status];
}

export function SimpleVoiceComposer({
  initialPlatformKey,
  initialProjectId,
  initialRubricId,
  viewModel,
}: {
  initialPlatformKey?: string;
  initialProjectId?: string;
  initialRubricId?: string;
  viewModel: NewContentViewModel;
}) {
  const resumeDraft = viewModel.resumeDraft;
  const requestedProjectId = resumeDraft?.projectId ?? initialProjectId;
  const requestedRubricId = resumeDraft?.rubricId ?? initialRubricId;
  const requestedProject = viewModel.projects.find((project) => project.id === requestedProjectId);
  const [selectedProjectId, setSelectedProjectId] = useState(requestedProject?.id ?? viewModel.projects[0]?.id ?? "");
  const initialProject = viewModel.projects.find((project) => project.id === selectedProjectId);
  const requestedRubric = initialProject?.rubrics.find((rubric) => rubric.id === requestedRubricId);
  const [selectedRubricId, setSelectedRubricId] = useState(requestedRubric?.id ?? "");
  const resumedPlatforms = (resumeDraft?.platformKeys ?? []).filter(isPlatformKey);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>(
    resumedPlatforms.length ? resumedPlatforms : ["telegram", "max"],
  );
  const requestedPlatform = initialPlatformKey && isPlatformKey(initialPlatformKey)
    ? initialPlatformKey
    : resumedPlatforms[0] ?? "telegram";
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [message, setMessage] = useState(
    resumeDraft
      ? "Материал открыт из истории. Поправьте исходный текст и нажмите «Пересобрать версии»."
      : viewModel.modeLabel === "api"
      ? "Выберите проект, при необходимости рубрику, и нажмите микрофон."
      : "Сейчас открыт пример интерфейса. Для записи нужен доступный API.",
  );
  const [segments, setSegments] = useState<Segment[]>([]);
  const [transcript, setTranscript] = useState(resumeDraft?.transcript ?? "");
  const [contentId, setContentId] = useState<string | null>(resumeDraft?.contentId ?? null);
  const [sourceField, setSourceField] = useState<string | null>(resumeDraft?.sourceFieldKey ?? null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [mediaCount, setMediaCount] = useState(resumeDraft?.mediaCount ?? 0);
  const [mediaKinds, setMediaKinds] = useState<string[]>(resumeDraft?.mediaKinds ?? []);
  const [mediaRetentionDates, setMediaRetentionDates] = useState<string[]>(resumeDraft?.mediaRetentionDates ?? []);
  const [instagramFormat, setInstagramFormat] = useState<InstagramFormat | null>(() => {
    const resumed = resumeDraft?.latestVariants.find((variant) => variant.platform_key === "instagram")?.payload.instagram_format;
    return resumed === "image" || resumed === "carousel" || resumed === "reel" ? resumed : null;
  });
  const [results, setResults] = useState<Record<PlatformKey, PlatformResult>>(() => {
    const hydrated = emptyResults();
    for (const variant of resumeDraft?.latestVariants ?? []) {
      if (isPlatformKey(variant.platform_key)) {
        hydrated[variant.platform_key] = { status: "ready", variant };
      }
    }
    return hydrated;
  });
  const [activePlatform, setActivePlatform] = useState<PlatformKey>(requestedPlatform);
  const [editingPlatform, setEditingPlatform] = useState<PlatformKey | null>(null);
  const [editRichText, setEditRichText] = useState<RichTextDocument>(() => plainRichText(""));
  const [instruction, setInstruction] = useState("");
  const [applyToAll, setApplyToAll] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const [latestAiUsage, setLatestAiUsage] = useState<AiUsageSummary | null>(null);
  const [feedbackByVariant, setFeedbackByVariant] = useState<Record<string, PlatformVariantFeedbackOut | null>>({});
  const [lengthMode, setLengthMode] = useState<LengthMode>("auto");
  const [lengthSheetOpen, setLengthSheetOpen] = useState(false);
  const [exactMinChars, setExactMinChars] = useState("1800");
  const [exactMaxChars, setExactMaxChars] = useState("2500");
  const [copyTextFamilyTarget, setCopyTextFamilyTarget] = useState(true);
  const [exactPlatform, setExactPlatform] = useState<PlatformKey>("telegram");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef(resumeDraft?.transcript ?? "");
  const contentIdRef = useRef<string | null>(resumeDraft?.contentId ?? null);
  const sourceFieldRef = useRef<string | null>(resumeDraft?.sourceFieldKey ?? null);
  const sourceBlockIdRef = useRef<string | null>(resumeDraft?.sourceBlockId ?? null);
  const lockedTranscriptRef = useRef(resumeDraft?.transcript ?? "");
  const didFocusRequestedPlatformRef = useRef(false);

  useEffect(() => {
    if (!resumeDraft || !initialPlatformKey || didFocusRequestedPlatformRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("platform-results")?.scrollIntoView({ block: "start" });
      didFocusRequestedPlatformRef.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialPlatformKey, resumeDraft]);

  const project = useMemo(
    () => viewModel.projects.find((item) => item.id === selectedProjectId) ?? viewModel.projects[0],
    [selectedProjectId, viewModel.projects],
  );
  const rubric = useMemo(
    () => project?.rubrics.find((item) => item.id === selectedRubricId),
    [project, selectedRubricId],
  );
  const canUseApi = viewModel.modeLabel === "api" && Boolean(viewModel.workspaceId && project);
  const activeResult = results[activePlatform];
  const activePreflight = activeResult.variant ? variantPreflight(activeResult.variant) : null;
  const activeFeedback = activeResult.variant ? feedbackByVariant[activeResult.variant.id] : null;

  useEffect(() => {
    const variantId = activeResult.variant?.id;
    if (!variantId || Object.prototype.hasOwnProperty.call(feedbackByVariant, variantId)) return;
    let cancelled = false;
    void apiRequest<PlatformVariantFeedbackResponse>(`/api/v1/platform-variants/${variantId}/feedback`, { method: "GET" })
      .then((response) => {
        if (!cancelled) setFeedbackByVariant((current) => ({ ...current, [variantId]: response.feedback }));
      })
      .catch(() => {
        if (!cancelled) setFeedbackByVariant((current) => ({ ...current, [variantId]: null }));
      });
    return () => { cancelled = true; };
  }, [activeResult.variant?.id, feedbackByVariant]);

  function updateTranscript(value: string) {
    transcriptRef.current = value;
    setTranscript(value);
  }

  function updateProject(projectId: string) {
    const nextProject = viewModel.projects.find((item) => item.id === projectId);
    setSelectedProjectId(projectId);
    setSelectedRubricId("");
    setContentId(null);
    contentIdRef.current = null;
    setSourceField(null);
    sourceFieldRef.current = null;
    sourceBlockIdRef.current = null;
    setSegments([]);
    updateTranscript("");
    setResults(emptyResults());
    setMessage("Проект изменён. Можно выбрать рубрику или начать без неё.");
  }

  async function ensureContent(): Promise<{ contentId: string; fieldKey: string }> {
    if (contentIdRef.current && sourceFieldRef.current) {
      return { contentId: contentIdRef.current, fieldKey: sourceFieldRef.current };
    }
    if (!canUseApi || !project) {
      throw new Error("Для создания материала нужен доступный API и проект.");
    }
    setMessage(rubric ? "Создаю материал по выбранной рубрике…" : "Создаю материал по общим правилам проекта…");
    const sourceTitle = transcriptRef.current
      .trim()
      .split(/[.!?\n]/, 1)[0]
      ?.trim()
      .slice(0, 120);
    const item = await apiRequest<ContentItemOut>(`/api/v1/projects/${project.id}/content-items`, {
      body: {
        rubric_id: rubric?.id ?? null,
        title_internal: sourceTitle || (rubric ? `Материал рубрики «${rubric.name}»` : "Новый материал"),
      },
      method: "POST",
    });
    const guidedForm = await apiRequest<GuidedFormResponse>(`/api/v1/content-items/${item.id}/guided-form`, {
      method: "GET",
    });
    const fieldKey = sourceFieldKey(guidedForm);
    contentIdRef.current = item.id;
    sourceFieldRef.current = fieldKey;
    setContentId(item.id);
    setSourceField(fieldKey);
    return { contentId: item.id, fieldKey };
  }

  async function uploadVoice(blob: Blob, context: { contentId: string; fieldKey: string }) {
    try {
      setCaptureState("uploading");
      setMessage("Загружаю голосовой фрагмент…");
      const mimeType = blob.type || "audio/webm";
      const presign = await apiRequest<MediaPresignResponse>("/api/v1/media/presign-upload", {
        body: {
          content_item_id: context.contentId,
          filename: `voice-${Date.now()}.${extensionForMimeType(mimeType)}`,
          kind: "voice",
          mime_type: mimeType,
          size_bytes: blob.size,
          workspace_id: viewModel.workspaceId,
        },
        method: "POST",
      });
      const uploadResponse = await fetch(presign.upload_url, {
        body: blob,
        headers: { "Content-Type": mimeType },
        method: "PUT",
      });
      if (!uploadResponse.ok) throw new Error(`Не удалось загрузить аудио: ${uploadResponse.status}.`);
      await apiRequest<MediaOut>(`/api/v1/media/${presign.media_id}/complete-upload`, {
        body: { codec_metadata: { source: "simple-voice-composer" }, size_bytes: blob.size },
        method: "POST",
      });
      const currentItem = await apiRequest<ContentItemOut>(`/api/v1/content-items/${context.contentId}`, {
        method: "GET",
      });
      const block = await apiRequest<BlockOut>(
        `/api/v1/content-items/${context.contentId}/blocks/${context.fieldKey}`,
        {
          body: {
            source_media_id: presign.media_id,
            source_type: "voice",
            transcript_text: transcriptRef.current || null,
            value: transcriptRef.current,
            version: currentItem.version,
          },
          method: "PUT",
        },
      );
      sourceBlockIdRef.current = block.id;
      setCaptureState("transcribing");
      setMessage("Расшифровываю фрагмент…");
      const job = await apiRequest<TranscriptionJobOut>(`/api/v1/content-blocks/${block.id}/transcribe`, {
        body: { media_id: presign.media_id, provider_key: "openai" },
        method: "POST",
      });
      const segmentId = job.id;
      const segmentText = job.transcript_text.trim();
      const merged = [transcriptRef.current.trim(), segmentText].filter(Boolean).join("\n\n");
      setSegments((current) => [
        ...current,
        {
          id: segmentId,
          label: `Фрагмент ${current.length + 1}`,
          status: "проверить",
          transcript: segmentText,
        },
      ]);
      setCurrentJobId(job.id);
      setCurrentSegmentId(segmentId);
      updateTranscript(merged);
      setCaptureState("review");
      setMessage("Фрагмент расшифрован. Исправьте общий текст и примите его.");
    } catch (error) {
      setCaptureState("error");
      setMessage(error instanceof Error ? error.message : "Не удалось расшифровать фрагмент.");
    }
  }

  async function startRecording() {
    try {
      if (currentJobId) {
        setMessage("Сначала примите текущую расшифровку.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Браузер не дал доступ к микрофону. Загрузите аудиофайл.");
      }
      const context = await ensureContent();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        void uploadVoice(blob, context);
      };
      recorder.start();
      recorderRef.current = recorder;
      setCaptureState("recording");
      setMessage(`Идёт запись фрагмента ${segments.length + 1}.`);
    } catch (error) {
      setCaptureState("error");
      setMessage(error instanceof Error ? error.message : "Не удалось начать запись.");
    }
  }

  function pauseRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause();
      setCaptureState("paused");
      setMessage("Запись на паузе. Можно продолжить или закончить фрагмент.");
    }
  }

  function continueRecording() {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume();
      setCaptureState("recording");
      setMessage("Запись продолжена.");
    }
  }

  function finishSegment() {
    if (recorderRef.current && ["recording", "paused"].includes(recorderRef.current.state)) {
      recorderRef.current.stop();
      setMessage("Фрагмент готов. Начинаю расшифровку…");
    }
  }

  async function acceptTranscript(lock = false): Promise<void> {
    if (!currentJobId || !transcriptRef.current.trim()) return;
    const accepted = await apiRequest<BlockOut>(`/api/v1/transcription-jobs/${currentJobId}/accept`, {
      body: { corrected_text: transcriptRef.current.trim(), lock },
      method: "POST",
    });
    setSegments((current) =>
      current.map((segment) => (segment.id === currentSegmentId ? { ...segment, status: "принят" } : segment)),
    );
    setCurrentJobId(null);
    setCurrentSegmentId(null);
    setCaptureState("accepted");
    setMessage(`Принято фрагментов: ${segments.length}. Можно добавить ещё или собрать версии.`);
    if (lock) lockedTranscriptRef.current = transcriptRef.current.trim();
    sourceFieldRef.current = accepted.field_key;
    sourceBlockIdRef.current = accepted.id;
  }

  async function saveMergedTranscript(context: { contentId: string; fieldKey: string }) {
    if (!transcriptRef.current.trim()) throw new Error("Сначала продиктуйте или вставьте исходный текст.");
    if (currentJobId) await acceptTranscript(false);
    if (lockedTranscriptRef.current === transcriptRef.current.trim()) return;
    let saved: BlockOut;
    if (sourceBlockIdRef.current) {
      saved = await apiRequest<BlockOut>(`/api/v1/content-blocks/${sourceBlockIdRef.current}`, {
        body: {
          lock: false,
          source_type: "transcription",
          transcript_text: transcriptRef.current.trim(),
          value: transcriptRef.current.trim(),
        },
        method: "PATCH",
      });
    } else {
      const currentItem = await apiRequest<ContentItemOut>(`/api/v1/content-items/${context.contentId}`, {
        method: "GET",
      });
      saved = await apiRequest<BlockOut>(`/api/v1/content-items/${context.contentId}/blocks/${context.fieldKey}`, {
        body: {
          lock: false,
          source_type: "transcription",
          transcript_text: transcriptRef.current.trim(),
          value: transcriptRef.current.trim(),
          version: currentItem.version,
        },
        method: "PUT",
      });
    }
    sourceBlockIdRef.current = saved.id;
    lockedTranscriptRef.current = transcriptRef.current.trim();
  }

  async function uploadVisuals(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]);
    const media = selected.filter((file) => supportedTypes.has(file.type));
    if (media.length !== selected.length) {
      setMessage("Поддерживаются фото JPEG, PNG, WebP и видео MP4/MOV.");
      return;
    }
    if (media.some((file) => file.size > (file.type.startsWith("video/") ? 100 : 8) * 1024 * 1024)) {
      setMessage("Фото должно быть не больше 8 МБ, видео — не больше 100 МБ.");
      return;
    }
    try {
      const context = await ensureContent();
      const existing = await apiRequest<ContentMediaResponse>(`/api/v1/content-items/${context.contentId}/media`, {
        method: "GET",
      });
      if (existing.media.length + media.length > 10) {
        setMessage("К одной публикации можно прикрепить до 10 медиафайлов.");
        return;
      }
      setMessage(`Загружаю медиа: 0 из ${media.length}.`);
      const uploadedIds: string[] = [];
      const uploadedKinds: string[] = [];
      const uploadedRetentionDates: string[] = [];
      for (const [index, file] of media.entries()) {
        const presign = await apiRequest<MediaPresignResponse>("/api/v1/media/presign-upload", {
          body: {
            content_item_id: context.contentId,
            filename: file.name || `media-${Date.now()}-${index}`,
            kind: file.type.startsWith("video/") ? "video" : "image",
            mime_type: file.type,
            size_bytes: file.size,
            workspace_id: viewModel.workspaceId,
          },
          method: "POST",
        });
        const response = await fetch(presign.upload_url, {
          body: file,
          headers: { "Content-Type": file.type },
          method: "PUT",
        });
        if (!response.ok) throw new Error(`Не удалось загрузить «${file.name}».`);
        const completed = await apiRequest<MediaOut>(`/api/v1/media/${presign.media_id}/complete-upload`, {
          body: { codec_metadata: { original_name: file.name }, size_bytes: file.size },
          method: "POST",
        });
        uploadedIds.push(presign.media_id);
        uploadedKinds.push(completed.kind);
        if (completed.retention_until) uploadedRetentionDates.push(completed.retention_until);
        setMessage(`Загружаю медиа: ${index + 1} из ${media.length}.`);
      }
      const currentItem = await apiRequest<ContentItemOut>(`/api/v1/content-items/${context.contentId}`, {
        method: "GET",
      });
      const attached = await apiRequest<ContentMediaResponse>(
        `/api/v1/content-items/${context.contentId}/media-order`,
        {
          body: {
            media: [
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
            ],
            version: currentItem.version,
          },
          method: "PUT",
        },
      );
      setMediaCount(attached.media.length);
      setMediaKinds((current) => [...current, ...uploadedKinds]);
      setMediaRetentionDates((current) => [...current, ...uploadedRetentionDates]);
      setMessage(
        `Медиа прикреплены: ${attached.media.length}. Первые ${Math.min(attached.media.length, 3)} ИИ использует при сборке.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить медиа.");
    }
  }

  function instagramFormatIssue(): string | null {
    if (!selectedPlatforms.includes("instagram")) return null;
    if (!instagramFormat) return "Для Instagram выберите формат публикации.";
    if (instagramFormat === "image" && mediaCount !== 1) {
      return "Для одной публикации Instagram прикрепите ровно один фото- или видеофайл.";
    }
    if (instagramFormat === "carousel" && (mediaCount < 2 || mediaCount > 10)) {
      return "Для карусели Instagram прикрепите от 2 до 10 фото или видео.";
    }
    if (instagramFormat === "reel" && (mediaCount !== 1 || mediaKinds[0] !== "video")) {
      return "Для Reel Instagram прикрепите ровно одно видео MP4 или MOV.";
    }
    return null;
  }

  async function uploadAudioFile(files: FileList | null) {
    const audio = Array.from(files ?? []).find((file) => file.type.startsWith("audio/"));
    if (!audio) return;
    try {
      const context = await ensureContent();
      await uploadVoice(audio, context);
    } catch (error) {
      setCaptureState("error");
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить аудиофайл.");
    }
  }

  function updatePlatformResult(key: PlatformKey, result: PlatformResult) {
    setResults((current) => ({ ...current, [key]: result }));
  }

  async function generatePlatform(contentItemId: string, key: PlatformKey): Promise<AiUsageSummary | null> {
    updatePlatformResult(key, { status: "loading" });
    try {
      const generated = await apiRequest<PlatformVariantsResponse>(
        `/api/v1/content-items/${contentItemId}/generate-variants`,
        {
          body: {
            instagram_format: key === "instagram" ? instagramFormat : null,
            length_overrides: buildLengthOverrides(),
            platform_keys: [key],
          },
          method: "POST",
        },
      );
      let variant = generated.variants.find((item) => item.platform_key === key);
      if (!variant) throw new Error("Сервер не вернул вариант.");
      let adaptationUsage: AiUsageSummary | null = null;
      const needsFormatAdaptation = key === "instagram" && instagramFormat !== null;
      if (missesLengthTarget(variant) || needsFormatAdaptation) {
        const instructions = [
          needsFormatAdaptation ? instagramFormatInstruction(instagramFormat, variant) : "",
          missesLengthTarget(variant) ? lengthRefinementInstruction(variant) : "",
        ].filter(Boolean);
        const refined = await apiRequest<PlatformVariantRefinementResponse>(
          `/api/v1/platform-variants/${variant.id}/refine`,
          { body: { instruction: instructions.join("\n\n") }, method: "POST" },
        );
        variant = refined.variant;
        adaptationUsage = refinementUsage(refined);
      }
      const validated = await apiRequest<PlatformVariantOut>(`/api/v1/platform-variants/${variant.id}/validate`, {
        method: "POST",
      });
      updatePlatformResult(key, { status: "ready", variant: validated });
      return adaptationUsage;
    } catch (error) {
      updatePlatformResult(key, {
        error: error instanceof Error ? error.message : "Не удалось собрать вариант.",
        status: "error",
      });
      return null;
    }
  }

  function buildLengthOverrides(): Partial<Record<PlatformKey, LengthTarget>> {
    if (lengthMode === "auto") return {};
    if (lengthMode !== "exact") {
      return Object.fromEntries(selectedPlatforms.map((key) => [key, lengthProfiles[lengthMode][key]]));
    }
    const minChars = Number(exactMinChars) || null;
    const maxChars = Number(exactMaxChars) || null;
    const keys: PlatformKey[] = copyTextFamilyTarget
      ? selectedPlatforms.filter((key) => ["telegram", "max", "vk"].includes(key))
      : [exactPlatform];
    return Object.fromEntries(keys.map((key) => [key, { min_chars: minChars, max_chars: maxChars }]));
  }

  async function assembleVersions() {
    if (!selectedPlatforms.length) {
      setMessage("Отметьте хотя бы одну площадку.");
      return;
    }
    const formatIssue = instagramFormatIssue();
    if (formatIssue) {
      setMessage(formatIssue);
      return;
    }
    try {
      setIsAssembling(true);
      const context = await ensureContent();
      await saveMergedTranscript(context);
      setMessage("Проверяю факты и собираю мастер-текст…");
      const facts = await apiRequest<GenerationRunOut>(`/api/v1/content-items/${context.contentId}/extract-facts`, {
        method: "POST",
      });
      const helpers = await Promise.allSettled([
        apiRequest<GenerationRunOut>(`/api/v1/content-items/${context.contentId}/suggest-hook`, { method: "POST" }),
        apiRequest<GenerationRunOut>(`/api/v1/content-items/${context.contentId}/suggest-ratings`, { method: "POST" }),
      ]);
      const master = await apiRequest<GenerationRunOut>(
        `/api/v1/content-items/${context.contentId}/assemble-master`,
        { method: "POST" },
      );
      if (master.status !== "completed") {
        throw new Error(master.error_message || "Мастер-текст не собран.");
      }
      const masterPayload = master.response_json as {
        quality?: { warnings?: Array<{ code?: string }> };
      } | null;
      const usedProviderFallback = Boolean(
        masterPayload?.quality?.warnings?.some((warning) => warning.code === "ai_provider_fallback"),
      );
      const completedHelpers = helpers.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      const baseUsage = [facts, ...completedHelpers, master].map(generationRunUsage);
      setActivePlatform(selectedPlatforms[0]);
      setMessage("Мастер готов. Версии площадок появляются по мере готовности.");
      const adaptationUsage = await Promise.all(selectedPlatforms.map((key) => generatePlatform(context.contentId, key)));
      const totalUsage = mergeUsage([...baseUsage, ...adaptationUsage]);
      setLatestAiUsage(totalUsage);
      setMessage(
        usedProviderFallback
          ? "ИИ-сервис не ответил: показан безопасный черновик из вашей расшифровки. Проверьте его перед доработкой."
          : "Готовые версии можно проверить, отредактировать и скопировать.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось собрать версии.");
    } finally {
      setIsAssembling(false);
    }
  }

  async function saveVariantText(key: PlatformKey, richText: RichTextDocument) {
    const variant = results[key].variant;
    const text = richTextPlain(richText).trim();
    if (!variant || !text.trim()) return;
    setIsSavingVariant(true);
    try {
      const updated = await apiRequest<PlatformVariantOut>(`/api/v1/platform-variants/${variant.id}`, {
        body: { rich_text: richText, text },
        method: "PATCH",
      });
      updatePlatformResult(key, { status: "ready", variant: updated });
      setEditingPlatform(null);
      setMessage(`${platformLabel(key)}: изменения сохранены в новой версии.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить вариант.");
    } finally {
      setIsSavingVariant(false);
    }
  }

  async function setVariantFeedback(
    reaction: PlatformVariantFeedbackOut["reaction"],
    learnStyle = false,
  ) {
    const variant = activeResult.variant;
    if (!variant) return;
    try {
      const response = await apiRequest<PlatformVariantFeedbackResponse>(
        `/api/v1/platform-variants/${variant.id}/feedback`,
        {
          body: {
            learn_style: learnStyle,
            reaction,
            version: activeFeedback?.version ?? null,
          },
          method: "PUT",
        },
      );
      setFeedbackByVariant((current) => ({ ...current, [variant.id]: response.feedback }));
      setMessage(
        learnStyle
          ? `${platformLabel(activePlatform)}: финальная ручная версия сохранена как внутренний пример стиля. OpenAI не обучается.`
          : `${platformLabel(activePlatform)}: отдельная реакция сохранена.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить реакцию.");
    }
  }

  async function clearVariantFeedback() {
    const variant = activeResult.variant;
    if (!variant) return;
    try {
      await apiRequest<PlatformVariantFeedbackResponse>(
        `/api/v1/platform-variants/${variant.id}/feedback`,
        { method: "DELETE" },
      );
      setFeedbackByVariant((current) => ({ ...current, [variant.id]: null }));
      setMessage(`${platformLabel(activePlatform)}: реакция снята, связанный внутренний пример отключён.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось снять реакцию.");
    }
  }

  async function refineVariants(refinementInstruction: string, label: string) {
    const keys = applyToAll ? selectedPlatforms : [activePlatform];
    const readyKeys = keys.filter((key) => results[key].variant);
    if (!readyKeys.length) {
      setMessage("Сначала соберите хотя бы одну версию площадки.");
      return;
    }
    setIsRefining(true);
    setMessage(`${label}: ИИ дорабатывает ${readyKeys.length === 1 ? "открытую версию" : "выбранные версии"}…`);
    try {
      const usageParts: Array<AiUsageSummary | null> = [];
      const warnings: string[] = [];
      for (const key of readyKeys) {
        const variant = results[key].variant;
        if (!variant) continue;
        const refined = await apiRequest<PlatformVariantRefinementResponse>(
          `/api/v1/platform-variants/${variant.id}/refine`,
          {
            body: { instruction: refinementInstruction },
            method: "POST",
          },
        );
        updatePlatformResult(key, { status: "ready", variant: refined.variant });
        usageParts.push(refinementUsage(refined));
        warnings.push(...refined.warnings);
      }
      const totalUsage = mergeUsage(usageParts);
      setLatestAiUsage(totalUsage);
      setInstruction("");
      setMessage(
        warnings.length
          ? `${label}: версия готова, но ИИ оставил предупреждение: ${warnings[0]}`
          : `${label}: новая версия готова. Предыдущая сохранена в истории ревизий.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "ИИ не смог доработать текст. Последняя хорошая версия сохранена.",
      );
    } finally {
      setIsRefining(false);
    }
  }

  async function copyActive() {
    const variant = activeResult.variant;
    const text = variantText(variant);
    if (!variant || !text) return;
    const mode = await copyRichText(richTextFromPayload(variant.payload, text));
    setMessage(
      mode === "rich"
        ? `${platformLabel(activePlatform)}: текст и зашитые ссылки скопированы.`
        : `${platformLabel(activePlatform)}: браузер скопировал обычный текст без скрытого форматирования.`,
    );
  }

  const targetMin = rubric?.editorialMinChars ?? null;
  const targetMax = rubric?.editorialMaxChars ?? null;

  if (!viewModel.projects.length) {
    return (
      <Card className="mx-auto grid w-full max-w-3xl justify-items-start gap-4 border-dashed p-6 sm:p-8">
        <Badge tone="info">Перед первой публикацией</Badge>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Сначала создайте проект или канал</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Проект хранит общие правила и примеры. После этого можно создавать обычные публикации без рубрики или добавлять рубрики для повторяемых форматов.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/projects/new">
            <Plus size={16} />
            Создать проект
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl min-w-0 gap-5" data-testid="simple-voice-composer">
      <section className="hidden min-w-0 gap-4 rounded-2xl bg-primary p-4 text-primary-foreground shadow-panel sm:grid sm:p-6">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge className="bg-white/15 text-white">Создать материал</Badge>
            <h1 className="mt-3 break-words text-2xl font-semibold leading-tight sm:text-3xl">
              Надиктуйте один раз — получите версии для площадок
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
              Общие правила проекта работают всегда. Рубрика добавляет отдельную структуру и примеры, если она выбрана.
            </p>
          </div>
          {contentId ? (
            <Button asChild className="bg-white text-primary hover:bg-white/90" size="sm" variant="secondary">
              <Link href={`/app/content/${contentId}`}>Расширенный режим</Link>
            </Button>
          ) : null}
        </div>
      </section>

      {viewModel.notice ? (
        <div className="rounded-lg border border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] p-3 text-sm leading-6 text-muted">
          {viewModel.notice}
        </div>
      ) : null}

      {resumeDraft ? (
        <div className="rounded-lg border border-primary bg-[color-mix(in_srgb,var(--primary),transparent_94%)] p-3 text-sm leading-6 text-foreground" data-testid="resume-history-notice">
          Вы продолжаете сохранённый материал. Исходник, фотографии и готовые версии уже на месте; новая доработка сохранится как следующая ревизия того же материала.
        </div>
      ) : null}

      <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Проект
            <span className="relative">
              <select
                  className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none focus:border-primary sm:h-11"
                disabled={Boolean(contentId)}
                value={project?.id ?? ""}
                onChange={(event) => updateProject(event.currentTarget.value)}
              >
                {viewModel.projects.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 text-muted" size={18} />
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Рубрика <span className="font-normal text-muted">(необязательно)</span>
            <span className="relative">
              <select
                  className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none focus:border-primary sm:h-11"
                disabled={Boolean(contentId)}
                value={selectedRubricId}
                onChange={(event) => setSelectedRubricId(event.currentTarget.value)}
              >
                <option value="">Без рубрики — общие правила проекта</option>
                {(project?.rubrics ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 text-muted" size={18} />
            </span>
          </label>
        </div>

        {rubric ? (
          <div className="flex min-w-0 flex-wrap gap-2 text-xs text-muted">
            <Badge tone={rubric.approvedExampleCount >= 3 ? "success" : "warning"}>
              Примеры рубрики: {rubric.approvedExampleCount}
            </Badge>
            {rubric.approvedExampleCount < 3 ? (
              <Badge tone="info">запасные примеры проекта: {rubric.projectFallbackExampleCount}</Badge>
            ) : null}
            {targetMin || targetMax ? (
              <Badge>
                цель: {targetMin ? targetMin.toLocaleString("ru-RU") : "—"}–{targetMax ? targetMax.toLocaleString("ru-RU") : "—"} знаков
              </Badge>
            ) : null}
          </div>
        ) : null}
        {project?.hasFixedBoilerplate ? (
          <Badge className="w-fit" tone="info">Постоянный подвал со ссылками включён</Badge>
        ) : null}

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-foreground">Куда собрать</div>
            <button
              className="text-xs font-semibold text-primary"
              type="button"
              onClick={() =>
                setSelectedPlatforms(
                  selectedPlatforms.length === platformOptions.length
                    ? []
                    : platformOptions.map((platform) => platform.key),
                )
              }
            >
              {selectedPlatforms.length === platformOptions.length ? "Снять все" : "Выбрать все"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {platformOptions.map((platform) => {
              const selected = selectedPlatforms.includes(platform.key);
              return (
                <button
                  aria-pressed={selected}
                  className={
                    selected
                      ? "flex min-w-0 items-center gap-2 rounded-lg border border-primary bg-[color-mix(in_srgb,var(--primary),transparent_92%)] p-2.5 text-left sm:p-3"
                      : "flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background p-2.5 text-left sm:p-3"
                  }
                  key={platform.key}
                  type="button"
                  onClick={() =>
                    setSelectedPlatforms((current) =>
                      current.includes(platform.key)
                        ? current.filter((item) => item !== platform.key)
                        : [...current, platform.key],
                    )
                  }
                >
                  <span className={selected ? "grid size-5 shrink-0 place-items-center rounded bg-primary text-white" : "size-5 shrink-0 rounded border border-border"}>
                    {selected ? <Check size={13} /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{platform.label}</span>
                    <span className="hidden truncate text-[11px] text-muted sm:block">{platform.note}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {selectedPlatforms.includes("instagram") ? (
          <div className="grid gap-2 rounded-lg border border-border bg-surface-muted p-3" data-testid="instagram-format-picker">
            <div>
              <div className="text-sm font-semibold text-foreground">Формат Instagram</div>
              <p className="mt-0.5 text-xs leading-5 text-muted">Формат определяет требования к медиа и структуру готового текста.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["image", "Один пост", "1 медиа"],
                ["carousel", "Карусель", "2–10 медиа"],
                ["reel", "Reel", "1 видео"],
              ] as Array<[InstagramFormat, string, string]>).map(([format, label, note]) => (
                <button
                  aria-pressed={instagramFormat === format}
                  className={instagramFormat === format
                    ? "rounded-lg border border-primary bg-[color-mix(in_srgb,var(--primary),transparent_92%)] p-2 text-left"
                    : "rounded-lg border border-border bg-background p-2 text-left"}
                  key={format}
                  type="button"
                  onClick={() => setInstagramFormat(format)}
                >
                  <span className="block text-xs font-semibold text-foreground sm:text-sm">{label}</span>
                  <span className="block text-[10px] text-muted sm:text-xs">{note}</span>
                </button>
              ))}
            </div>
            {instagramFormatIssue() ? (
              <p className="text-xs leading-5 text-warning">{instagramFormatIssue()}</p>
            ) : (
              <Badge className="w-fit" tone="success">формат и медиа готовы</Badge>
            )}
          </div>
        ) : null}
        <button
          aria-expanded={lengthSheetOpen}
          className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 text-left text-sm"
          type="button"
          onClick={() => setLengthSheetOpen(true)}
        >
          <span><span className="font-semibold text-foreground">Длина этого поста</span><span className="ml-2 text-muted">{({ auto: "Авто по правилам", short: "Короткий", normal: "Обычный", detailed: "Подробный", exact: "Точно" } as Record<LengthMode, string>)[lengthMode]}</span></span>
          <span className="text-primary">Изменить</span>
        </button>
      </Card>

      {lengthSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 sm:items-center sm:justify-center" role="presentation" onMouseDown={() => setLengthSheetOpen(false)}>
          <section aria-labelledby="length-sheet-title" aria-modal="true" className="grid max-h-[90vh] w-full gap-4 overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-popover sm:max-w-lg sm:rounded-2xl" role="dialog" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-foreground" id="length-sheet-title">Длина этого поста</h2><p className="mt-1 text-sm leading-6 text-muted">Меняет только текущую сборку. Правила проекта и рубрики сохраняются.</p></div><button aria-label="Закрыть" className="p-2 text-muted" type="button" onClick={() => setLengthSheetOpen(false)}><X size={20} /></button></div>
            <div className="grid grid-cols-2 gap-2">
              {([['auto', 'Авто по правилам'], ['short', 'Короткий'], ['normal', 'Обычный'], ['detailed', 'Подробный'], ['exact', 'Точно']] as Array<[LengthMode, string]>).map(([mode, label]) => (
                <button aria-pressed={lengthMode === mode} className={lengthMode === mode ? "rounded-lg border border-primary bg-[color-mix(in_srgb,var(--primary),transparent_92%)] p-3 text-left text-sm font-semibold" : "rounded-lg border border-border p-3 text-left text-sm"} key={mode} type="button" onClick={() => setLengthMode(mode)}>{label}</button>
              ))}
            </div>
            {lengthMode === "exact" ? (
              <div className="grid gap-3 rounded-lg border border-border p-3">
                <label className="flex items-start gap-2 text-sm"><input checked={copyTextFamilyTarget} className="mt-1" type="checkbox" onChange={(event) => setCopyTextFamilyTarget(event.currentTarget.checked)} /><span><span className="font-semibold text-foreground">Одинаковая цель для Telegram, MAX и VK</span><span className="block text-xs leading-5 text-muted">Каждая версия всё равно хранится отдельно.</span></span></label>
                {!copyTextFamilyTarget ? <label className="grid gap-1 text-sm font-semibold">Площадка<select className="h-10 rounded-lg border border-border bg-background px-3" value={exactPlatform} onChange={(event) => setExactPlatform(event.currentTarget.value as PlatformKey)}>{selectedPlatforms.map((key) => <option key={key} value={key}>{platformLabel(key)}</option>)}</select></label> : null}
                <div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-sm">От<input className="h-10 rounded-lg border border-border bg-background px-3" min={1} type="number" value={exactMinChars} onChange={(event) => setExactMinChars(event.currentTarget.value)} /></label><label className="grid gap-1 text-sm">До<input className="h-10 rounded-lg border border-border bg-background px-3" min={1} type="number" value={exactMaxChars} onChange={(event) => setExactMaxChars(event.currentTarget.value)} /></label></div>
                {copyTextFamilyTarget && Number(exactMaxChars) > 4000 ? <p className="text-sm text-danger">Для MAX укажите не больше 4 000 знаков.</p> : null}
              </div>
            ) : null}
            <Button disabled={lengthMode === "exact" && (!Number(exactMinChars) || !Number(exactMaxChars) || Number(exactMinChars) > Number(exactMaxChars) || (copyTextFamilyTarget && Number(exactMaxChars) > 4000))} type="button" onClick={() => setLengthSheetOpen(false)}>Применить к текущему посту</Button>
          </section>
        </div>
      ) : null}

      <Card className="grid min-w-0 gap-4 overflow-hidden p-4 sm:p-6">
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground">Диктовка — главный вход</div>
          <p className="mt-1 text-sm text-muted">Можно записать один фрагмент или несколько по очереди.</p>
        </div>
        <div className="flex justify-center">
          <button
            aria-label="Начать диктовку"
            className="grid size-28 place-items-center rounded-full bg-accent text-accent-foreground shadow-popover transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 sm:size-32"
            disabled={["uploading", "transcribing", "review"].includes(captureState)}
            type="button"
            onClick={() => void startRecording()}
          >
            {captureState === "uploading" || captureState === "transcribing" ? (
              <Loader2 className="animate-spin" size={36} />
            ) : (
              <Mic size={40} />
            )}
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button disabled={captureState !== "recording"} size="sm" type="button" variant="secondary" onClick={pauseRecording}>
            <Pause size={15} />
            Пауза
          </Button>
          <Button disabled={captureState !== "paused"} size="sm" type="button" variant="secondary" onClick={continueRecording}>
            <Play size={15} />
            Продолжить
          </Button>
          <Button disabled={!["recording", "paused"].includes(captureState)} size="sm" type="button" onClick={finishSegment}>
            <CheckCircle2 size={15} />
            Закончить фрагмент
          </Button>
        </div>
        <div
          aria-live="polite"
          className={
            captureState === "error"
              ? "rounded-lg border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] p-3 text-sm leading-6 text-danger"
              : "rounded-lg border border-border bg-surface-muted p-3 text-sm leading-6 text-muted"
          }
        >
          {message}
        </div>

        {segments.length ? (
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-foreground">Фрагменты</div>
            {segments.map((segment) => (
              <div className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-border bg-background p-3" key={segment.id}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{segment.label}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{segment.transcript}</div>
                </div>
                <Badge className="shrink-0" tone={segment.status === "принят" ? "success" : "warning"}>
                  {segment.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : null}

        <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
          Общая расшифровка
          <span className="text-xs font-normal leading-5 text-muted">
            Для точной первой сборки назовите: заведение и адрес, блюдо, цену и вес,
            атмосферу, упаковку, вкус и захотите ли заказать снова. Четыре оценки ИИ предложит
            сам по вашей диктовке; вы сможете их поправить.
          </span>
          <textarea
            id="voice-transcript"
            className="min-h-40 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm font-normal leading-6 outline-none focus:border-primary"
            placeholder="Расшифровка всех фрагментов появится здесь. Можно также вставить текст вручную."
            value={transcript}
            onChange={(event) => updateTranscript(event.currentTarget.value)}
          />
        </label>
        <div className="flex min-w-0 flex-wrap gap-2">
          {currentJobId ? (
            <Button type="button" onClick={() => void acceptTranscript(false)}>
              <Check size={16} />
              Принять фрагмент
            </Button>
          ) : segments.length ? (
            <Button type="button" variant="secondary" onClick={() => void startRecording()}>
              <Plus size={16} />
              Добавить ещё диктовку
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => document.getElementById("voice-transcript")?.focus()}>
              <FileText size={16} />
              Вставить текст
            </Button>
          )}
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground">
            <Upload size={16} />
            Загрузить аудиофайл
            <input
              accept="audio/*"
              className="sr-only"
              type="file"
              onChange={(event) => {
                void uploadAudioFile(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        <div className="grid min-w-0 gap-3 rounded-xl border border-border bg-surface-muted p-4" data-testid="photo-upload-section">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-background text-primary">
              <Images size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-semibold text-foreground">Медиа к публикации</div>
                {mediaCount ? <Badge tone="success">добавлено: {mediaCount}</Badge> : null}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">
                Добавьте фото блюда, чек, меню, интерьер или видео для Reel. До 10 файлов; первые 3 ИИ
                использует как подсказку при сборке. Цены и надписи обязательно проверьте.
              </p>
            </div>
          </div>
          <label className="inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground">
            <Plus size={16} />
            Добавить фото или видео
            <input
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              className="sr-only"
              multiple
              type="file"
              onChange={(event) => {
                void uploadVisuals(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <div className="text-xs leading-5 text-muted">
            Фото JPEG, PNG, WebP до 8 МБ; видео MP4 или MOV до 100 МБ. Оригиналы хранятся 30 дней.
            {mediaRetentionDates.length ? (
              <> Ближайшая дата окончания хранения: {retentionDateLabel([...mediaRetentionDates].sort()[0])}.</>
            ) : null}
          </div>
        </div>
        <Button
          className="h-12 w-full text-base"
          disabled={isAssembling || !transcript.trim() || !selectedPlatforms.length || !canUseApi || Boolean(instagramFormatIssue())}
          type="button"
          onClick={() => void assembleVersions()}
        >
          {isAssembling ? <Loader2 className="animate-spin" size={18} /> : <WandSparkles size={18} />}
          {resumeDraft ? "Пересобрать версии" : "Собрать версии"}
        </Button>
      </Card>

      {selectedPlatforms.some((key) => results[key].status !== "idle") ? (
        <Card className="scroll-mt-20 grid min-w-0 gap-4 p-4 sm:p-5" data-testid="platform-results" id="platform-results">
          <div>
            <div className="text-lg font-semibold text-foreground">Готовые версии</div>
            <p className="mt-1 text-sm text-muted">Каждая площадка остаётся независимой. Ошибка одной не стирает остальные.</p>
          </div>
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
            {selectedPlatforms.map((key) => (
              <button
                className={
                  activePlatform === key
                    ? "shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    : "shrink-0 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground"
                }
                key={key}
                type="button"
                onClick={() => setActivePlatform(key)}
              >
                {platformLabel(key)}
                {results[key].status === "loading" ? <Loader2 className="ml-2 inline animate-spin" size={13} /> : null}
                {results[key].status === "error" ? <X className="ml-2 inline text-danger" size={13} /> : null}
              </button>
            ))}
          </div>

          {activeResult.status === "loading" ? (
            <div className="grid min-h-56 place-items-center rounded-lg border border-border bg-background text-sm text-muted">
              <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} />Версия собирается…</span>
            </div>
          ) : null}
          {activeResult.status === "error" ? (
            <div className="rounded-lg border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] p-4 text-sm leading-6 text-danger">
              {activeResult.error}
            </div>
          ) : null}
          {activeResult.status === "ready" && activeResult.variant ? (
            <div className="grid min-w-0 gap-4">
              <div className="flex min-w-0 flex-wrap gap-2">
                <Badge tone={hasMechanicalPlatformTruncation(activeResult.variant) ? "warning" : "success"}>
                  {hasMechanicalPlatformTruncation(activeResult.variant) ? "нужна полноценная пересборка" : "готово"}
                </Badge>
                <Badge>{activeResult.variant.character_count.toLocaleString("ru-RU")} знаков</Badge>
                {lengthTargetFromVariant(activeResult.variant) ? (
                  <Badge>
                    цель: {lengthTargetFromVariant(activeResult.variant)?.min_chars?.toLocaleString("ru-RU") ?? "—"}–{lengthTargetFromVariant(activeResult.variant)?.max_chars?.toLocaleString("ru-RU") ?? "—"} · {targetSourceLabel(lengthTargetFromVariant(activeResult.variant)?.source)}
                  </Badge>
                ) : null}
                {missesLengthTarget(activeResult.variant) ? <Badge tone="warning">нужна пересборка по длине</Badge> : null}
                {activePlatform === "instagram" && typeof activeResult.variant.payload.instagram_format === "string" ? (
                  <Badge tone="info">
                    формат: {({ image: "один пост", carousel: "карусель", reel: "Reel" } as Record<string, string>)[activeResult.variant.payload.instagram_format] ?? activeResult.variant.payload.instagram_format}
                  </Badge>
                ) : null}
                {activePlatform === "vk" ? <Badge tone="info">Запись сообщества</Badge> : null}
                {activePlatform === "vk" && typeof vkExportPackage(activeResult.variant)?.attachment_count === "number" ? (
                  <Badge>
                    текст + {String(vkExportPackage(activeResult.variant)?.attachment_count)} вложений
                  </Badge>
                ) : null}
                <Badge>
                  максимум: {resultHardLimit(
                    activePlatform,
                    activeResult.variant,
                    platformOptions.find((item) => item.key === activePlatform)?.hardLimit ?? null,
                  )?.toLocaleString("ru-RU") ?? "ручной экспорт"}
                </Badge>
              </div>
              <section
                aria-labelledby={`platform-preflight-title-${activePlatform}`}
                aria-live="polite"
                className="grid min-w-0 gap-3 rounded-lg border border-border bg-surface-muted p-3 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="platform-preflight"
                role="status"
                tabIndex={0}
              >
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground" id={`platform-preflight-title-${activePlatform}`}>
                    Проверка перед экспортом
                  </h3>
                  <Badge tone={activePreflight ? preflightStatusTone(activePreflight.status) : "warning"}>
                    {activePreflight ? preflightStatusLabel(activePreflight.status) : "Обновить проверку"}
                  </Badge>
                </div>
                {activePreflight ? (
                  <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                    {activePreflight.checks.map((check) => (
                      <div className="flex min-w-0 items-start gap-2 rounded-md border border-border bg-background p-3" key={check.key}>
                        {check.status === "pass" ? (
                          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={16} />
                        ) : check.status === "block" ? (
                          <X aria-hidden="true" className="mt-0.5 shrink-0 text-danger" size={16} />
                        ) : (
                          <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={16} />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
                            <span>{check.label}</span>
                            <span className={check.status === "pass" ? "text-success" : check.status === "block" ? "text-danger" : "text-warning"}>
                              {preflightStatusLabel(check.status)}
                            </span>
                          </div>
                          <p className="mt-1 break-words text-xs leading-5 text-muted">{check.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-muted">
                    Эта сохранённая версия создана до появления полной проверки. Пересоберите её, чтобы проверить длину, медиа, формат и способ отправки.
                  </p>
                )}
              </section>
              {activePlatform === "vk" ? (
                <div className="grid gap-2 rounded-lg border border-border bg-surface-muted p-3" data-testid="vk-export-package">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-foreground">Пакет для VK</div>
                    <Badge tone="warning">публикация вручную</Badge>
                  </div>
                  <p className="text-xs leading-5 text-muted">
                    Текст готов для записи сообщества. Вложения сохранены в том порядке, в котором их нужно добавить в VK.
                  </p>
                  {vkAttachmentSummary(activeResult.variant).length ? (
                    <div className="flex flex-wrap gap-2">
                      {vkAttachmentSummary(activeResult.variant).map((item) => <Badge key={item}>{item}</Badge>)}
                    </div>
                  ) : (
                    <div className="text-xs text-muted">Без вложений.</div>
                  )}
                </div>
              ) : null}
              {hasMechanicalPlatformTruncation(activeResult.variant) ? (
                <div className="rounded-lg border border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] p-3 text-sm leading-6 text-foreground">
                  Эта старая версия была механически обрезана. Нажмите «Пересобрать»: ИИ напишет для Instagram отдельный цельный текст по полному исходнику.
                </div>
              ) : null}
              {editingPlatform === activePlatform ? (
                <RichTextEditor
                  ariaLabel={`Редактор версии для ${platformLabel(activePlatform)}`}
                  value={editRichText}
                  onChange={setEditRichText}
                />
              ) : (
                <article className="max-h-[540px] overflow-y-auto rounded-lg border border-border bg-background p-4">
                  <RichTextPreview value={richTextFromPayload(activeResult.variant?.payload, variantText(activeResult.variant))} />
                </article>
              )}
              <div className="flex min-w-0 flex-wrap gap-2">
                <Button
                  disabled={hasMechanicalPlatformTruncation(activeResult.variant)}
                  type="button"
                  onClick={() => void copyActive()}
                >
                  <Clipboard size={16} />
                  Копировать
                </Button>
                {editingPlatform === activePlatform ? (
                  <>
                    <Button disabled={isSavingVariant} type="button" variant="secondary" onClick={() => void saveVariantText(activePlatform, editRichText)}>
                      {isSavingVariant ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                      Сохранить
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingPlatform(null)}>Отмена</Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingPlatform(activePlatform);
                      setEditRichText(richTextFromPayload(activeResult.variant?.payload, variantText(activeResult.variant)));
                    }}
                  >
                    <Pencil size={16} />
                    Редактировать
                  </Button>
                )}
                <Button
                  disabled={isRefining}
                  type="button"
                  variant="secondary"
                  onClick={() => void refineVariants(
                    "Сократи текст примерно на 15–20%, убери повторы и слабые вводные, но сохрани все факты, цену, адрес и вывод автора.",
                    "Короче",
                  )}
                >
                  Короче
                </Button>
                <Button
                  disabled={isRefining}
                  type="button"
                  variant="secondary"
                  onClick={() => void refineVariants(
                    "Сделай текст живее и разговорнее: усили ритм, конкретные наблюдения и авторский голос, не превращая текст в рекламу и не добавляя фактов.",
                    "Живее",
                  )}
                >
                  Живее
                </Button>
                <Button
                  disabled={isRefining}
                  type="button"
                  variant="secondary"
                  onClick={() => void refineVariants(
                    "Добавь 2–4 уместные короткие шутки или образные формулировки из контекста материала. Не выдумывай события и не шути вместо фактов.",
                    "Больше юмора",
                  )}
                >
                  Больше юмора
                </Button>
                <Button
                  disabled={isRefining}
                  type="button"
                  variant="secondary"
                  onClick={() => void refineVariants(
                    "Убери все эмодзи и поправь пробелы после удаления. Остальной текст и факты сохрани.",
                    "Без эмодзи",
                  )}
                >
                  Без эмодзи
                </Button>
                <Button
                  disabled={isRefining}
                  type="button"
                  variant="secondary"
                  onClick={() => void refineVariants(
                    "Перепиши эту версию заново: сохрани факты и вывод автора, но предложи другой сильный заход, более естественный ритм и чистое форматирование без двойных пустых строк.",
                    "Пересобрать",
                  )}
                >
                  <RotateCcw size={15} />
                  Пересобрать
                </Button>
              </div>
              <section className="grid min-w-0 gap-3 rounded-lg border border-border bg-surface-muted p-3" data-testid="platform-feedback">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Как получилась версия для {platformLabel(activePlatform)}?</h3>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Оценка относится только к этой площадке. «Отлично» запомнит стиль лишь после вашей ручной правки; OpenAI не обучается.
                    </p>
                  </div>
                  {activeFeedback ? <Badge tone={activeFeedback.reaction === "excellent" ? "success" : activeFeedback.reaction === "good" ? "info" : "warning"}>
                    {activeFeedback.learns_style ? "стиль запомнен" : "реакция сохранена"}
                  </Badge> : null}
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <Button
                    onClick={() => void setVariantFeedback("excellent", true)}
                    size="sm"
                    type="button"
                    variant={activeFeedback?.reaction === "excellent" ? "primary" : "secondary"}
                  >
                    Отлично · запомнить стиль
                  </Button>
                  <Button onClick={() => void setVariantFeedback("good")} size="sm" type="button" variant={activeFeedback?.reaction === "good" ? "primary" : "secondary"}>Хорошо</Button>
                  <Button onClick={() => void setVariantFeedback("needs_work")} size="sm" type="button" variant={activeFeedback?.reaction === "needs_work" ? "primary" : "secondary"}>Нужна правка</Button>
                  <Button onClick={() => void setVariantFeedback("not_my_style")} size="sm" type="button" variant={activeFeedback?.reaction === "not_my_style" ? "primary" : "secondary"}>Не мой стиль</Button>
                  {activeFeedback ? <Button onClick={() => void clearVariantFeedback()} size="sm" type="button" variant="ghost">Снять оценку</Button> : null}
                </div>
              </section>
              <div className="grid min-w-0 gap-2 rounded-lg border border-border bg-surface-muted p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <label className="grid gap-1 text-xs font-semibold text-muted">
                  Дополнительная команда для {platformLabel(activePlatform)}
                  <input
                    className="h-10 min-w-0 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground outline-none"
                    placeholder="Например: сохрани цену и адрес, сократи вступление"
                    value={instruction}
                    onChange={(event) => setInstruction(event.currentTarget.value)}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <input checked={applyToAll} type="checkbox" onChange={(event) => setApplyToAll(event.currentTarget.checked)} />
                    Применить ко всем выбранным версиям
                  </label>
                  <Button
                    disabled={isRefining || !instruction.trim()}
                    type="button"
                    variant="secondary"
                    onClick={() => void refineVariants(instruction.trim(), "Команда")}
                  >
                    {isRefining ? <Loader2 className="animate-spin" size={15} /> : <WandSparkles size={15} />}
                    Применить команду
                  </Button>
                </div>
              </div>
              {latestAiUsage ? (
                <div className="grid gap-2 rounded-lg border border-border bg-surface-muted p-3" data-testid="ai-usage-meter">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-foreground">Расход ИИ на последнюю операцию</div>
                    <Badge tone={latestAiUsage.estimatedTokens ? "warning" : "info"}>
                      {latestAiUsage.estimatedTokens ? "примерно" : "по данным провайдера"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-background p-2"><div className="text-[10px] uppercase tracking-wide text-muted">Вход</div><div className="mt-1 text-sm font-semibold text-foreground">{latestAiUsage.inputTokens.toLocaleString("ru-RU")}</div></div>
                    <div className="rounded-md bg-background p-2"><div className="text-[10px] uppercase tracking-wide text-muted">Выход</div><div className="mt-1 text-sm font-semibold text-foreground">{latestAiUsage.outputTokens.toLocaleString("ru-RU")}</div></div>
                    <div className="rounded-md bg-background p-2"><div className="text-[10px] uppercase tracking-wide text-muted">Всего</div><div className="mt-1 text-sm font-semibold text-foreground">{(latestAiUsage.inputTokens + latestAiUsage.outputTokens).toLocaleString("ru-RU")}</div></div>
                  </div>
                  <div className="text-xs leading-5 text-muted">
                    Стоимость текста: {latestAiUsage.costComplete ? `≈ $${(latestAiUsage.costMicroUsd / 1_000_000).toFixed(4)}` : "провайдер не вернул полные данные для расчёта"}.
                    Расшифровка аудио и будущий анализ изображений считаются отдельно. Это оценка себестоимости, не счёт клиенту.
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs leading-5 text-muted">
        <span>Публикация не запускается автоматически. Каждая версия требует проверки человеком.</span>
        <span className="flex items-center gap-1"><Sparkles size={13} />Источник: проект → рубрика → площадка</span>
      </div>
    </div>
  );
}
