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
  Lightbulb,
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
  bindStandaloneIdeaContentCreate,
  clearStandaloneIdeaHandoff,
  readStandaloneIdeaHandoff,
  standaloneIdeaPlanningValue,
  type StandaloneIdeaHandoff,
} from "@/features/standalone-ideas/idea-handoff";
import {
  type RichTextDocument,
  copyRichText,
  plainRichText,
  richTextFromPayload,
  richTextLinkCount,
  richTextPlain,
} from "@/lib/rich-text";
import {
  type BlockOut,
  type ContentCreateRequest,
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
import { type IdeaBriefViewModel, type NewContentViewModel } from "@/services/content";

type CaptureState =
  | "idle"
  | "requesting"
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

type AssemblyReceipt = {
  attempt: number;
  contentId: string;
  expiresAt: number;
  instagramFormat: InstagramFormat | null;
  lengthOverrides: Partial<Record<PlatformKey, LengthTarget>>;
  masterRevisionIdAtStart: string | null;
  platformKeys: PlatformKey[];
  startedAt: number;
  workspaceId: string;
};

type WakeLockHandle = {
  release: () => Promise<void>;
  released: boolean;
};

const ASSEMBLY_RECEIPT_PREFIX = "tmh:content-assembly:v1:";
const ASSEMBLY_RECEIPT_TTL_MS = 30 * 60 * 1000;

function assemblyReceiptKey(contentId: string): string {
  return `${ASSEMBLY_RECEIPT_PREFIX}${contentId}`;
}

function writeAssemblyReceipt(receipt: AssemblyReceipt): void {
  try {
    window.localStorage.setItem(assemblyReceiptKey(receipt.contentId), JSON.stringify(receipt));
  } catch {
    // Storage can be unavailable in private mode; server state still remains recoverable.
  }
}

function readAssemblyReceipt(contentId: string, workspaceId: string): AssemblyReceipt | null {
  const key = assemblyReceiptKey(contentId);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<AssemblyReceipt>;
    const validPlatforms = Array.isArray(value.platformKeys)
      && value.platformKeys.length > 0
      && value.platformKeys.every((platform) => isPlatformKey(platform));
    if (
      value.contentId !== contentId
      || value.workspaceId !== workspaceId
      || typeof value.startedAt !== "number"
      || typeof value.expiresAt !== "number"
      || value.expiresAt <= Date.now()
      || typeof value.attempt !== "number"
      || value.attempt < 0
      || !validPlatforms
      || (value.masterRevisionIdAtStart !== null && typeof value.masterRevisionIdAtStart !== "string")
      || (value.instagramFormat !== null && !["image", "carousel", "reel"].includes(String(value.instagramFormat)))
      || !value.lengthOverrides
      || typeof value.lengthOverrides !== "object"
      || Array.isArray(value.lengthOverrides)
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    return value as AssemblyReceipt;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage is unavailable; continue without client-side recovery metadata.
    }
    return null;
  }
}

function clearAssemblyReceipt(contentId: string): void {
  try {
    window.localStorage.removeItem(assemblyReceiptKey(contentId));
  } catch {
    // The server-side content and variants remain the source of truth.
  }
}

function formatRecordingSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

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

function preferredMimeType(): string | null {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
  if (typeof MediaRecorder === "undefined") return null;
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? null;
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

function standaloneIdeaViewModel(handoff: StandaloneIdeaHandoff): IdeaBriefViewModel {
  return {
    angle: handoff.idea.direction,
    detailQuestions: [handoff.idea.speakingPrompt],
    id: handoff.idea.id,
    ideaBrief: handoff.idea.direction,
    starterOutline: handoff.idea.speakingPrompt,
    title: handoff.idea.title,
  };
}

export function SimpleVoiceComposer({
  initialPlatformKey,
  initialProjectId,
  initialRubricId,
  initialStandaloneIdeaToken,
  viewModel,
}: {
  initialPlatformKey?: string;
  initialProjectId?: string;
  initialRubricId?: string;
  initialStandaloneIdeaToken?: string;
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
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [voiceSignalDetected, setVoiceSignalDetected] = useState(false);
  const [message, setMessage] = useState(
    resumeDraft
      ? resumeDraft.ideaBrief && !resumeDraft.transcript.trim()
        ? "Идея уже сохранена. Теперь расскажите основную мысль своими словами — голосом или текстом."
        : "Материал открыт из истории. Поправьте исходный текст и нажмите «Пересобрать версии»."
      : viewModel.modeLabel === "api"
      ? "Выберите проект, при необходимости рубрику, и нажмите микрофон."
      : "В демонстрации запись отключена. В рабочем кабинете микрофон будет доступен.",
  );
  const [segments, setSegments] = useState<Segment[]>([]);
  const [transcript, setTranscript] = useState(resumeDraft?.transcript ?? "");
  const [ideaBrief, setIdeaBrief] = useState<IdeaBriefViewModel | null>(resumeDraft?.ideaBrief ?? null);
  const [pendingStandaloneIdea, setPendingStandaloneIdea] = useState<StandaloneIdeaHandoff | null>(null);
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
  const [isRubricUpdating, setIsRubricUpdating] = useState(false);
  const [rubricLocked, setRubricLocked] = useState(Boolean(resumeDraft?.latestVariants.length));
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
  const pendingStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const voiceMeterFrameRef = useRef<number | null>(null);
  const voiceMeterLastUpdateRef = useRef(0);
  const captureRequestRef = useRef(0);
  const mountedRef = useRef(true);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef(resumeDraft?.transcript ?? "");
  const contentIdRef = useRef<string | null>(resumeDraft?.contentId ?? null);
  const sourceFieldRef = useRef<string | null>(resumeDraft?.sourceFieldKey ?? null);
  const sourceBlockIdRef = useRef<string | null>(resumeDraft?.sourceBlockId ?? null);
  const lockedTranscriptRef = useRef(resumeDraft?.transcript ?? "");
  const pendingStandaloneIdeaRef = useRef<StandaloneIdeaHandoff | null>(null);
  const ensureContentPromiseRef = useRef<Promise<{ contentId: string; fieldKey: string }> | null>(null);
  const didFocusRequestedPlatformRef = useRef(false);
  const isAssemblingRef = useRef(false);
  const assemblyRecoveryPromiseRef = useRef<Promise<void> | null>(null);
  const recoverAssemblyRef = useRef<((receipt: AssemblyReceipt, waitForRunningRequest: boolean) => Promise<void>) | null>(null);
  const wakeLockRef = useRef<WakeLockHandle | null>(null);

  function stopVoiceMeter() {
    if (voiceMeterFrameRef.current !== null) {
      window.cancelAnimationFrame(voiceMeterFrameRef.current);
      voiceMeterFrameRef.current = null;
    }
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
    if (mountedRef.current) setVoiceLevel(0);
  }

  function startVoiceMeter(stream: MediaStream) {
    stopVoiceMeter();
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
        if (timestamp - voiceMeterLastUpdateRef.current >= 80) {
          let sum = 0;
          for (const value of values) {
            const normalized = (value - 128) / 128;
            sum += normalized * normalized;
          }
          const level = Math.min(1, Math.sqrt(sum / values.length) * 4);
          if (mountedRef.current) {
            setVoiceLevel(level);
            if (level >= 0.035) setVoiceSignalDetected(true);
          }
          voiceMeterLastUpdateRef.current = timestamp;
        }
        voiceMeterFrameRef.current = window.requestAnimationFrame(measure);
      };
      voiceMeterFrameRef.current = window.requestAnimationFrame(measure);
    } catch {
      // The timer and explicit state remain truthful; never draw a fake level.
      setVoiceLevel(0);
    }
  }

  async function releaseWakeLock() {
    const current = wakeLockRef.current;
    wakeLockRef.current = null;
    if (current && !current.released) {
      try {
        await current.release();
      } catch {
        // Wake Lock is an enhancement; persisted server state is the recovery path.
      }
    }
  }

  async function requestWakeLock() {
    if (document.visibilityState !== "visible" || wakeLockRef.current) return;
    const wakeLock = (navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockHandle> };
    }).wakeLock;
    if (!wakeLock) return;
    try {
      wakeLockRef.current = await wakeLock.request("screen");
    } catch {
      // iOS can deny the request; lifecycle recovery remains active.
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      captureRequestRef.current += 1;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
        recorder.stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
      }
      pendingStreamRef.current?.getTracks().forEach((track) => track.stop());
      pendingStreamRef.current = null;
      stopVoiceMeter();
      void releaseWakeLock();
    };
  }, []);

  useEffect(() => {
    if (captureState !== "recording") return;
    const timer = window.setInterval(() => setRecordingSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [captureState]);

  useEffect(() => {
    isAssemblingRef.current = isAssembling;
    const shouldStayAwake = isAssembling || captureState === "recording";
    if (shouldStayAwake) void requestWakeLock();
    else void releaseWakeLock();
  }, [captureState, isAssembling]);

  useEffect(() => {
    pendingStandaloneIdeaRef.current = null;
    setPendingStandaloneIdea(null);
    if (!initialStandaloneIdeaToken) return;
    const handoff = readStandaloneIdeaHandoff(initialStandaloneIdeaToken);
    if (!handoff || handoff.workspaceId !== viewModel.workspaceId) {
      if (handoff && handoff.workspaceId !== viewModel.workspaceId) {
        clearStandaloneIdeaHandoff(handoff.handoffToken);
      }
      if (!resumeDraft) setIdeaBrief(null);
      setMessage("Идея устарела или не прошла проверку. Вернитесь в раздел «Идеи» и выберите её заново.");
      return;
    }
    if (resumeDraft?.ideaBrief) {
      clearStandaloneIdeaHandoff(handoff.handoffToken);
      removeStandaloneIdeaQuery(resumeDraft.contentId);
      return;
    }
    if (handoff.contentCreate) {
      setSelectedProjectId(handoff.contentCreate.projectId);
      setSelectedRubricId(handoff.contentCreate.rubricId ?? "");
    }
    pendingStandaloneIdeaRef.current = handoff;
    setPendingStandaloneIdea(handoff);
    setIdeaBrief(standaloneIdeaViewModel(handoff));
    if (!resumeDraft) {
      transcriptRef.current = "";
      setTranscript("");
    }
    setMessage("Идея выбрана. Теперь расскажите её своими словами — голосом или текстом.");
    const frame = window.requestAnimationFrame(() => document.getElementById("voice-record-button")?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [initialStandaloneIdeaToken, resumeDraft, viewModel.workspaceId]);

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
    setSelectedProjectId(projectId);
    setSelectedRubricId("");
    setContentId(null);
    contentIdRef.current = null;
    setSourceField(null);
    sourceFieldRef.current = null;
    sourceBlockIdRef.current = null;
    setSegments([]);
    if (!pendingStandaloneIdeaRef.current) setIdeaBrief(null);
    setResults(emptyResults());
    setRubricLocked(false);
    setMessage("Проект изменён. Ваш текст остался на месте; можно выбрать рубрику или начать без неё.");
  }

  async function updateRubric(rubricId: string) {
    const previousRubricId = selectedRubricId;
    if (!contentIdRef.current) {
      setSelectedRubricId(rubricId);
      setMessage(rubricId ? "Рубрика выбрана. Можно начинать диктовку." : "Будут применены общие правила проекта.");
      return;
    }
    if (rubricLocked || isRubricUpdating) return;
    setSelectedRubricId(rubricId);
    setIsRubricUpdating(true);
    setMessage("Сохраняю рубрику для этого материала…");
    try {
      const currentItem = await apiRequest<ContentItemOut>(`/api/v1/content-items/${contentIdRef.current}`, {
        method: "GET",
      });
      await apiRequest<ContentItemOut>(`/api/v1/content-items/${contentIdRef.current}`, {
        body: { rubric_id: rubricId || null, version: currentItem.version },
        method: "PATCH",
      });
      if (!sourceBlockIdRef.current) {
        const guidedForm = await apiRequest<GuidedFormResponse>(
          `/api/v1/content-items/${contentIdRef.current}/guided-form`,
          { method: "GET" },
        );
        const fieldKey = sourceFieldKey(guidedForm);
        sourceFieldRef.current = fieldKey;
        setSourceField(fieldKey);
      }
      setMessage(rubricId ? "Рубрика изменена. Диктовка и медиа остались на месте." : "Включены общие правила проекта. Диктовка и медиа остались на месте.");
    } catch (error) {
      setSelectedRubricId(previousRubricId);
      const text = error instanceof Error ? error.message : "Не удалось изменить рубрику.";
      if (text.includes("уже участвует в сборке")) setRubricLocked(true);
      setMessage(text);
    } finally {
      setIsRubricUpdating(false);
    }
  }

  function rememberCreatedContentItem(contentItemId: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("edit", contentItemId);
    const suffix = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${suffix ? `?${suffix}` : ""}`);
  }

  function removeStandaloneIdeaQuery(contentItemId?: string) {
    const params = new URLSearchParams(window.location.search);
    params.delete("idea");
    if (contentItemId) params.set("edit", contentItemId);
    const suffix = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${suffix ? `?${suffix}` : ""}`);
  }

  function dismissStandaloneIdea() {
    const handoffToken = pendingStandaloneIdeaRef.current?.handoffToken ?? initialStandaloneIdeaToken;
    if (handoffToken) clearStandaloneIdeaHandoff(handoffToken);
    pendingStandaloneIdeaRef.current = null;
    setPendingStandaloneIdea(null);
    setIdeaBrief(null);
    removeStandaloneIdeaQuery();
    setMessage("Идея убрана. Можно начать другой материал или вернуться за новыми идеями.");
  }

  async function persistStandaloneIdea(contentItemId: string): Promise<void> {
    const handoff = pendingStandaloneIdeaRef.current;
    if (!handoff) return;
    if (handoff.workspaceId !== viewModel.workspaceId) {
      clearStandaloneIdeaHandoff(handoff.handoffToken);
      pendingStandaloneIdeaRef.current = null;
      setPendingStandaloneIdea(null);
      setIdeaBrief(null);
      throw new Error("Идея относится к другому кабинету. Выберите её заново.");
    }
    const currentItem = await apiRequest<ContentItemOut>(`/api/v1/content-items/${contentItemId}`, { method: "GET" });
    await apiRequest<BlockOut>(`/api/v1/content-items/${contentItemId}/blocks/idea_brief`, {
      body: {
        lock: false,
        source_type: "ai_suggested",
        transcript_text: null,
        value: standaloneIdeaPlanningValue(handoff),
        version: currentItem.version,
      },
      method: "PUT",
    });
    clearStandaloneIdeaHandoff(handoff.handoffToken);
    pendingStandaloneIdeaRef.current = null;
    setPendingStandaloneIdea(null);
    removeStandaloneIdeaQuery(contentItemId);
  }

  async function ensureContentOnce(): Promise<{ contentId: string; fieldKey: string }> {
    const handoff = pendingStandaloneIdeaRef.current;
    if (handoff && handoff.expiresAt <= Date.now()) {
      clearStandaloneIdeaHandoff(handoff.handoffToken);
      pendingStandaloneIdeaRef.current = null;
      setPendingStandaloneIdea(null);
      setIdeaBrief(null);
      removeStandaloneIdeaQuery(contentIdRef.current ?? undefined);
      throw new Error("Идея устарела. Выберите её заново или повторите действие без идеи.");
    }
    if (contentIdRef.current) {
      if (sourceFieldRef.current) {
        await persistStandaloneIdea(contentIdRef.current);
        return { contentId: contentIdRef.current, fieldKey: sourceFieldRef.current };
      }
      const guidedForm = await apiRequest<GuidedFormResponse>(`/api/v1/content-items/${contentIdRef.current}/guided-form`, {
        method: "GET",
      });
      const fieldKey = sourceFieldKey(guidedForm);
      sourceFieldRef.current = fieldKey;
      setSourceField(fieldKey);
      await persistStandaloneIdea(contentIdRef.current);
      return { contentId: contentIdRef.current, fieldKey };
    }
    if (viewModel.modeLabel !== "api" || !viewModel.workspaceId) {
      throw new Error("Для создания материала нужен доступный API и проект.");
    }
    let createHandoff = handoff;
    let createProject = project;
    let createRubric = rubric;
    if (createHandoff) {
      if (!createHandoff.contentCreate) {
        if (!createProject) {
          throw new Error("Для создания материала выберите проект.");
        }
        createHandoff = bindStandaloneIdeaContentCreate(createHandoff, {
          projectId: createProject.id,
          rubricId: createRubric?.id ?? null,
          titleInternal: createHandoff.idea.title,
        });
        pendingStandaloneIdeaRef.current = createHandoff;
        setPendingStandaloneIdea(createHandoff);
      }
      const binding = createHandoff.contentCreate;
      if (!binding) throw new Error("Не удалось подготовить материал к надёжному сохранению.");
      const boundProject = viewModel.projects.find((candidate) => candidate.id === binding.projectId);
      const boundRubric = binding.rubricId
        ? boundProject?.rubrics.find((candidate) => candidate.id === binding.rubricId)
        : undefined;
      if (!boundProject || (binding.rubricId && !boundRubric)) {
        throw new Error("Проект или рубрика изменились. Вернитесь в раздел «Идеи» и начните заново.");
      }
      createProject = boundProject;
      createRubric = boundRubric;
      if (selectedProjectId !== binding.projectId) setSelectedProjectId(binding.projectId);
      if (selectedRubricId !== (binding.rubricId ?? "")) setSelectedRubricId(binding.rubricId ?? "");
    }
    if (!createProject) {
      throw new Error("Для создания материала выберите проект.");
    }
    setMessage(createRubric ? "Создаю материал по выбранной рубрике…" : "Создаю материал по общим правилам проекта…");
    const sourceTitle = transcriptRef.current
      .trim()
      .split(/[.!?\n]/, 1)[0]
      ?.trim()
      .slice(0, 120);
    const createBody: ContentCreateRequest = {
      client_content_id: createHandoff?.clientContentId,
      rubric_id: createRubric?.id ?? null,
      title_internal: createHandoff?.contentCreate?.titleInternal
        || sourceTitle
        || (createRubric ? `Материал рубрики «${createRubric.name}»` : "Новый материал"),
    };
    const item = await apiRequest<ContentItemOut>(`/api/v1/projects/${createProject.id}/content-items`, {
      body: createBody,
      method: "POST",
    });
    contentIdRef.current = item.id;
    setContentId(item.id);
    rememberCreatedContentItem(item.id);
    const guidedForm = await apiRequest<GuidedFormResponse>(`/api/v1/content-items/${item.id}/guided-form`, {
      method: "GET",
    });
    const fieldKey = sourceFieldKey(guidedForm);
    sourceFieldRef.current = fieldKey;
    setSourceField(fieldKey);
    await persistStandaloneIdea(item.id);
    return { contentId: item.id, fieldKey };
  }

  function ensureContent(): Promise<{ contentId: string; fieldKey: string }> {
    if (ensureContentPromiseRef.current) return ensureContentPromiseRef.current;
    let pending: Promise<{ contentId: string; fieldKey: string }>;
    pending = ensureContentOnce().finally(() => {
      if (ensureContentPromiseRef.current === pending) ensureContentPromiseRef.current = null;
    });
    ensureContentPromiseRef.current = pending;
    return pending;
  }

  async function uploadVoice(blob: Blob, context: { contentId: string; fieldKey: string }) {
    if (blob.size <= 0) {
      setCaptureState("error");
      setMessage("Запись получилась пустой — звук не сохранился. Нажмите микрофон и повторите фрагмент.");
      return;
    }
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
    if (!["idle", "accepted", "error"].includes(captureState)) return;
    const requestId = captureRequestRef.current + 1;
    captureRequestRef.current = requestId;
    let stream: MediaStream | null = null;
    try {
      if (currentJobId) {
        setMessage("Сначала примите текущую расшифровку.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Браузер не дал доступ к микрофону. Загрузите аудиофайл.");
      }
      setCaptureState("requesting");
      setMessage("Подключаю микрофон…");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const activeStream = stream;
      if (!mountedRef.current || requestId !== captureRequestRef.current) {
        activeStream.getTracks().forEach((track) => track.stop());
        return;
      }
      pendingStreamRef.current = activeStream;
      const context = await ensureContent();
      if (!mountedRef.current || requestId !== captureRequestRef.current) {
        activeStream.getTracks().forEach((track) => track.stop());
        pendingStreamRef.current = null;
        return;
      }
      const requestedMimeType = preferredMimeType();
      const recorder = requestedMimeType
        ? new MediaRecorder(activeStream, { mimeType: requestedMimeType })
        : new MediaRecorder(activeStream);
      const mimeType = recorder.mimeType || requestedMimeType || "audio/webm";
      chunksRef.current = [];
      setRecordingSeconds(0);
      setVoiceLevel(0);
      setVoiceSignalDetected(false);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        activeStream.getTracks().forEach((track) => track.stop());
        pendingStreamRef.current = null;
        recorderRef.current = null;
        stopVoiceMeter();
        if (!mountedRef.current) return;
        setCaptureState("error");
        setMessage("Запись прервалась в браузере. Нажмите микрофон и повторите фрагмент.");
      };
      recorder.onstop = () => {
        activeStream.getTracks().forEach((track) => track.stop());
        pendingStreamRef.current = null;
        recorderRef.current = null;
        stopVoiceMeter();
        if (!mountedRef.current) return;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        void uploadVoice(blob, context);
      };
      recorder.start(250);
      recorderRef.current = recorder;
      pendingStreamRef.current = null;
      startVoiceMeter(activeStream);
      setCaptureState("recording");
      setMessage(`Идёт запись фрагмента ${segments.length + 1}.`);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      pendingStreamRef.current = null;
      stopVoiceMeter();
      if (mountedRef.current && requestId === captureRequestRef.current) {
        setCaptureState("error");
        setMessage(error instanceof Error ? error.message : "Не удалось начать запись.");
      }
    }
  }

  function pauseRecording() {
    if (recorderRef.current?.state === "recording") {
      try {
        recorderRef.current.requestData();
      } catch {
        // The final stop still requests the remaining browser buffer.
      }
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
      setCaptureState("uploading");
      setMessage("Сохраняю записанный фрагмент…");
      try {
        recorderRef.current.requestData();
      } catch {
        // `stop()` still dispatches the final dataavailable event.
      }
      recorderRef.current.stop();
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

  async function generatePlatform(
    contentItemId: string,
    key: PlatformKey,
    options?: {
      instagramFormat?: InstagramFormat | null;
      lengthOverrides?: Partial<Record<PlatformKey, LengthTarget>>;
      propagateError?: boolean;
    },
  ): Promise<AiUsageSummary | null> {
    updatePlatformResult(key, { status: "loading" });
    try {
      const requestedInstagramFormat = options?.instagramFormat === undefined
        ? instagramFormat
        : options.instagramFormat;
      const generated = await apiRequest<PlatformVariantsResponse>(
        `/api/v1/content-items/${contentItemId}/generate-variants`,
        {
          body: {
            instagram_format: key === "instagram" ? requestedInstagramFormat : null,
            length_overrides: options?.lengthOverrides ?? buildLengthOverrides(),
            platform_keys: [key],
          },
          method: "POST",
        },
      );
      let variant = generated.variants.find((item) => item.platform_key === key);
      if (!variant) throw new Error("Сервер не вернул вариант.");
      let adaptationUsage: AiUsageSummary | null = null;
      const needsFormatAdaptation = key === "instagram" && requestedInstagramFormat !== null;
      if (missesLengthTarget(variant) || needsFormatAdaptation) {
        const instructions = [
          needsFormatAdaptation && requestedInstagramFormat
            ? instagramFormatInstruction(requestedInstagramFormat, variant)
            : "",
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
      if (options?.propagateError) throw error;
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

  async function inspectAssembly(receipt: AssemblyReceipt): Promise<{
    item: ContentItemOut;
    missing: PlatformKey[];
    variants: Partial<Record<PlatformKey, PlatformVariantOut>>;
  }> {
    const [item, response] = await Promise.all([
      apiRequest<ContentItemOut>(`/api/v1/content-items/${receipt.contentId}`, { method: "GET" }),
      apiRequest<PlatformVariantsResponse>(`/api/v1/content-items/${receipt.contentId}/variants`, { method: "GET" }),
    ]);
    const variants: Partial<Record<PlatformKey, PlatformVariantOut>> = {};
    if (item.current_master_revision_id) {
      for (const variant of response.variants) {
        if (
          isPlatformKey(variant.platform_key)
          && receipt.platformKeys.includes(variant.platform_key)
          && variant.master_revision_id === item.current_master_revision_id
          && !variants[variant.platform_key]
        ) {
          variants[variant.platform_key] = variant;
        }
      }
    }
    return {
      item,
      missing: receipt.platformKeys.filter((key) => !variants[key]),
      variants,
    };
  }

  async function hydrateAssemblyVariants(
    receipt: AssemblyReceipt,
    variants: Partial<Record<PlatformKey, PlatformVariantOut>>,
  ) {
    const hydrated = await Promise.all(receipt.platformKeys.flatMap((key) => {
      const variant = variants[key];
      if (!variant) return [];
      return [apiRequest<PlatformVariantOut>(`/api/v1/platform-variants/${variant.id}/validate`, {
        method: "POST",
      }).then((validated) => [key, validated] as const)];
    }));
    for (const [key, variant] of hydrated) updatePlatformResult(key, { status: "ready", variant });
  }

  async function assembleVersions(options?: {
    receipt?: AssemblyReceipt;
    rebuildFromSource?: boolean;
    recovering?: boolean;
  }) {
    const workspaceId = viewModel.workspaceId;
    if (!workspaceId) {
      setMessage("Рабочее пространство недоступно. Обновите страницу и повторите попытку.");
      return;
    }
    const targetPlatforms = options?.receipt?.platformKeys ?? selectedPlatforms;
    if (!targetPlatforms.length) {
      setMessage("Отметьте хотя бы одну площадку.");
      return;
    }
    if (isAssemblingRef.current && !options?.recovering) return;
    const requestedInstagramFormat = options?.receipt?.instagramFormat ?? instagramFormat;
    const formatIssue = options?.recovering ? null : instagramFormatIssue();
    if (formatIssue) {
      setMessage(formatIssue);
      return;
    }
    let activeReceipt = options?.receipt;
    try {
      isAssemblingRef.current = true;
      setIsAssembling(true);
      const context = await ensureContent();
      await saveMergedTranscript(context);
      if (!activeReceipt) {
        const currentItem = await apiRequest<ContentItemOut>(`/api/v1/content-items/${context.contentId}`, {
          method: "GET",
        });
        activeReceipt = {
          attempt: 0,
          contentId: context.contentId,
          expiresAt: Date.now() + ASSEMBLY_RECEIPT_TTL_MS,
          instagramFormat: requestedInstagramFormat,
          lengthOverrides: buildLengthOverrides(),
          masterRevisionIdAtStart: currentItem.current_master_revision_id,
          platformKeys: targetPlatforms,
          startedAt: Date.now(),
          workspaceId,
        };
      } else if (options?.recovering) {
        activeReceipt = { ...activeReceipt, attempt: activeReceipt.attempt + 1 };
      }
      const receipt = activeReceipt;
      const firstPlatform = receipt?.platformKeys[0];
      if (!receipt || !firstPlatform) throw new Error("Не удалось сохранить параметры сборки.");
      writeAssemblyReceipt(receipt);
      setSelectedPlatforms(receipt.platformKeys);
      setActivePlatform(firstPlatform);
      setMessage(
        options?.rebuildFromSource
          ? "Возвращаюсь к вашей диктовке и собираю новый мастер-текст…"
          : "Проверяю факты и собираю мастер-текст…",
      );
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
      setRubricLocked(true);
      const masterPayload = master.response_json as {
        quality?: { warnings?: Array<{ code?: string }> };
      } | null;
      const usedProviderFallback = Boolean(
        masterPayload?.quality?.warnings?.some((warning) => warning.code === "ai_provider_fallback"),
      );
      const completedHelpers = helpers.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      const baseUsage = [facts, ...completedHelpers, master].map(generationRunUsage);
      setMessage("Мастер готов. Версии площадок появляются по мере готовности.");
      const adaptationUsage = await Promise.all(receipt.platformKeys.map((key) => generatePlatform(
        context.contentId,
        key,
        {
          instagramFormat: receipt.instagramFormat,
          lengthOverrides: receipt.lengthOverrides,
          propagateError: true,
        },
      )));
      const totalUsage = mergeUsage([...baseUsage, ...adaptationUsage]);
      setLatestAiUsage(totalUsage);
      setMessage(
        usedProviderFallback
          ? "ИИ-сервис не ответил: показан безопасный черновик из вашей расшифровки. Проверьте его перед доработкой."
          : options?.rebuildFromSource
            ? "Новый текст собран из вашей диктовки. Предыдущие редакции сохранены в истории."
            : "Готовые версии можно проверить, отредактировать и скопировать.",
      );
      clearAssemblyReceipt(context.contentId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось собрать версии.");
      if (activeReceipt && activeReceipt.attempt >= 2) clearAssemblyReceipt(activeReceipt.contentId);
    } finally {
      isAssemblingRef.current = false;
      setIsAssembling(false);
    }
  }

  async function recoverAssembly(receipt: AssemblyReceipt, waitForRunningRequest: boolean) {
    if (assemblyRecoveryPromiseRef.current) return assemblyRecoveryPromiseRef.current;
    const recovery = (async () => {
      const firstPlatform = receipt.platformKeys[0];
      if (!firstPlatform) return;
      isAssemblingRef.current = true;
      setSelectedPlatforms(receipt.platformKeys);
      setActivePlatform(firstPlatform);
      if (receipt.instagramFormat) setInstagramFormat(receipt.instagramFormat);
      setIsAssembling(true);
      setMessage("Восстанавливаю сборку после возвращения в приложение…");

      const shouldWaitForRunningRequest = waitForRunningRequest || Date.now() < receipt.startedAt + 120_000;
      const waitUntil = shouldWaitForRunningRequest
        ? Math.max(Date.now(), receipt.startedAt + 120_000)
        : Date.now();
      let inspected = await inspectAssembly(receipt);
      while (
        inspected.item.current_master_revision_id === receipt.masterRevisionIdAtStart
        && Date.now() < waitUntil
      ) {
        await new Promise((resolve) => window.setTimeout(resolve, 4000));
        inspected = await inspectAssembly(receipt);
      }

      const newMasterReady = Boolean(
        inspected.item.current_master_revision_id
        && inspected.item.current_master_revision_id !== receipt.masterRevisionIdAtStart,
      );
      if (newMasterReady) {
        await hydrateAssemblyVariants(receipt, inspected.variants);
        if (inspected.missing.length) {
          setMessage("Мастер сохранён. Дособираю версии площадок…");
          await Promise.all(inspected.missing.map((key) => generatePlatform(
            receipt.contentId,
            key,
            {
              instagramFormat: receipt.instagramFormat,
              lengthOverrides: receipt.lengthOverrides,
              propagateError: true,
            },
          )));
        }
        clearAssemblyReceipt(receipt.contentId);
        setRubricLocked(true);
        setMessage("Сборка восстановлена. Готовые версии можно проверить и скопировать.");
        isAssemblingRef.current = false;
        setIsAssembling(false);
        return;
      }

      if (receipt.attempt >= 2) {
        clearAssemblyReceipt(receipt.contentId);
        isAssemblingRef.current = false;
        setIsAssembling(false);
        setMessage("Автоматическое восстановление не завершилось. Ваш текст и медиа сохранены; нажмите «Собрать версии» ещё раз.");
        return;
      }

      isAssemblingRef.current = false;
      setIsAssembling(false);
      await assembleVersions({ receipt, recovering: true });
    })().catch((error) => {
      isAssemblingRef.current = false;
      setIsAssembling(false);
      setMessage(error instanceof Error ? error.message : "Не удалось восстановить сборку. Ваш исходник сохранён.");
    }).finally(() => {
      assemblyRecoveryPromiseRef.current = null;
    });
    assemblyRecoveryPromiseRef.current = recovery;
    return recovery;
  }

  recoverAssemblyRef.current = recoverAssembly;

  useEffect(() => {
    const recoverIfNeeded = (waitForRunningRequest: boolean) => {
      const contentId = contentIdRef.current;
      const workspaceId = viewModel.workspaceId;
      if (document.visibilityState !== "visible" || !contentId || !workspaceId) return;
      const receipt = readAssemblyReceipt(contentId, workspaceId);
      if (receipt) void recoverAssemblyRef.current?.(receipt, waitForRunningRequest);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        if (isAssemblingRef.current || recorderRef.current?.state === "recording") void requestWakeLock();
        recoverIfNeeded(isAssemblingRef.current);
      }
    };
    const initial = window.setTimeout(() => recoverIfNeeded(false), 0);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      window.clearTimeout(initial);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [viewModel.workspaceId]);

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
          ? "Мы сохраняем эту версию как пример для следующих текстов; сама модель не переобучается."
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
    const richText = richTextFromPayload(variant.payload, text);
    const linkCount = richTextLinkCount(richText);
    const mode = await copyRichText(richText);
    setMessage(
      linkCount > 0 && mode === "rich"
        ? `${platformLabel(activePlatform)}: текст и ${linkCount} ${linkCount === 1 ? "ссылка" : linkCount < 5 ? "ссылки" : "ссылок"} скопированы.`
        : linkCount > 0
          ? `${platformLabel(activePlatform)}: браузер скопировал обычный текст; скрытые ссылки могли не сохраниться.`
          : `${platformLabel(activePlatform)}: текст скопирован. В постоянном подвале ссылки пока не настроены.`,
    );
  }

  const targetMin = rubric?.editorialMinChars ?? null;
  const targetMax = rubric?.editorialMaxChars ?? null;

  if (!viewModel.projects.length) {
    const continueIdeaToken = pendingStandaloneIdea?.handoffToken ?? initialStandaloneIdeaToken;
    const hasIdeaToContinue = Boolean(continueIdeaToken);
    const continueWithIdeaHref = continueIdeaToken
      ? `/app/projects/new?idea=${encodeURIComponent(continueIdeaToken)}`
      : "/app/projects/new";
    return (
      <Card className="mx-auto grid w-full max-w-3xl justify-items-start gap-4 border-dashed p-6 sm:p-8">
        <Badge tone="info">{hasIdeaToContinue ? "Идея сохранена" : "Перед первой публикацией"}</Badge>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {hasIdeaToContinue ? "Создайте первый проект — и продолжим диктовку" : "Сначала создайте проект или канал"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {hasIdeaToContinue
              ? "Проект хранит правила вашего канала. Достаточно указать название: выбранная идея останется с вами, а материал пока не создаётся."
              : "Проект хранит общие правила и примеры. После этого можно создавать обычные публикации без рубрики или добавлять рубрики для повторяемых форматов."}
          </p>
        </div>
        {pendingStandaloneIdea ? (
          <div className="grid w-full gap-2 rounded-xl border border-primary/30 bg-[color-mix(in_srgb,var(--primary),transparent_94%)] p-4">
            <strong className="text-sm text-foreground">{pendingStandaloneIdea.idea.title}</strong>
            <p className="text-sm leading-6 text-muted">{pendingStandaloneIdea.idea.direction}</p>
            <p className="text-xs leading-5 text-muted"><strong className="text-foreground">С чего начать:</strong> {pendingStandaloneIdea.idea.speakingPrompt}</p>
          </div>
        ) : null}
        <Button asChild>
          <Link href={continueWithIdeaHref}>
            <Plus size={16} />
            {hasIdeaToContinue ? "Создать проект и продолжить" : "Создать проект"}
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1450px] min-w-0 gap-5" data-testid="simple-voice-composer">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
      <section className="grid min-w-0 gap-4 rounded-2xl border border-border bg-sidebar p-4 text-sidebar-foreground shadow-panel sm:p-6 lg:col-start-1 lg:row-start-1">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge tone="success">Голосовая студия</Badge>
            <h1 className="font-editorial mt-3 break-words text-4xl leading-tight text-foreground sm:text-5xl">
              Расскажите идею — остальное мы соберём.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Говорите свободно. Получите готовую версию для каждой выбранной площадки.
            </p>
          </div>
          {contentId ? (
            <Button asChild className="min-h-11" size="sm" variant="secondary">
              <Link href={`/app/content/${contentId}`}>Расширенный режим</Link>
            </Button>
          ) : null}
        </div>
      </section>

      {viewModel.notice ? (
        <div className="rounded-lg border border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] p-3 text-sm leading-6 text-muted lg:col-start-1">
          {viewModel.notice}
        </div>
      ) : null}

      {resumeDraft ? (
        <div className="rounded-lg border border-primary bg-[color-mix(in_srgb,var(--primary),transparent_94%)] p-3 text-sm leading-6 text-foreground lg:col-start-1" data-testid="resume-history-notice">
          Вы продолжаете сохранённый материал. Исходник, фотографии и готовые версии уже на месте; новая доработка сохранится как следующая ревизия того же материала.
        </div>
      ) : null}

      <Card className="order-1 grid min-w-0 gap-4 p-4 sm:p-5 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-7">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Проект
            <span className="relative">
              <select
                  className="h-11 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none focus:border-primary"
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
                  className="h-11 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none focus:border-primary"
                disabled={isRubricUpdating || rubricLocked || isAssembling}
                value={selectedRubricId}
                onChange={(event) => void updateRubric(event.currentTarget.value)}
              >
                <option value="">Без рубрики — общие правила проекта</option>
                {(project?.rubrics ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 text-muted" size={18} />
            </span>
            <span className="flex min-h-5 items-center gap-1.5 text-xs font-normal leading-5 text-muted">
              {isRubricUpdating ? <Loader2 className="animate-spin" size={13} /> : null}
              {rubricLocked ? "Рубрика зафиксирована после сборки поста." : "Рубрику можно менять, пока пост ещё не собран."}
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
        {project?.hasFixedBoilerplate ? project.footerLinkCount > 0 ? (
          <Badge className="w-fit" tone="success">
            Постоянный подвал: {project.footerLinkCount} {project.footerLinkCount === 1 ? "ссылка" : project.footerLinkCount < 5 ? "ссылки" : "ссылок"}
          </Badge>
        ) : (
          <Link className="w-fit" href={`/app/projects/${project.id}/settings`}>
            <Badge tone="warning">Подвал добавлен, но ссылки не настроены</Badge>
          </Link>
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
          <div className="grid grid-cols-2 gap-2">
            {platformOptions.map((platform) => {
              const selected = selectedPlatforms.includes(platform.key);
              return (
                <button
                  aria-pressed={selected}
                  className={
                    selected
                      ? "flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-success bg-[color-mix(in_srgb,var(--success),transparent_90%)] p-2.5 text-left sm:p-3"
                      : "flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-border bg-background p-2.5 text-left sm:p-3"
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
                  <span className={selected ? "grid size-5 shrink-0 place-items-center rounded bg-success text-background" : "size-5 shrink-0 rounded border border-border"}>
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
                    ? "rounded-lg border border-success bg-[color-mix(in_srgb,var(--success),transparent_90%)] p-2 text-left"
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
        <Button
          className="hidden h-12 w-full text-base lg:flex"
          disabled={isAssembling || !transcript.trim() || !selectedPlatforms.length || !canUseApi || Boolean(instagramFormatIssue())}
          type="button"
          onClick={() => void assembleVersions()}
        >
          {isAssembling ? <Loader2 className="animate-spin" size={18} /> : <WandSparkles size={18} />}
          Подготовить {selectedPlatforms.length || 0} {selectedPlatforms.length === 1 ? "версию" : selectedPlatforms.length < 5 ? "версии" : "версий"}
        </Button>
        <p className="text-center text-xs leading-5 text-muted">Сначала вы увидите результат. Ничего не публикуется автоматически.</p>
      </Card>

      {lengthSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 sm:items-center sm:justify-center" role="presentation" onMouseDown={() => setLengthSheetOpen(false)}>
          <section aria-labelledby="length-sheet-title" aria-modal="true" className="grid max-h-[90vh] w-full gap-4 overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-popover sm:max-w-lg sm:rounded-2xl" role="dialog" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-foreground" id="length-sheet-title">Длина этого поста</h2><p className="mt-1 text-sm leading-6 text-muted">Меняет только текущую сборку. Правила проекта и рубрики сохраняются.</p></div><button aria-label="Закрыть" className="grid min-h-11 min-w-11 place-items-center text-muted" type="button" onClick={() => setLengthSheetOpen(false)}><X size={20} /></button></div>
            <div className="grid grid-cols-2 gap-2">
              {([['auto', 'Авто по правилам'], ['short', 'Короткий'], ['normal', 'Обычный'], ['detailed', 'Подробный'], ['exact', 'Точно']] as Array<[LengthMode, string]>).map(([mode, label]) => (
                <button aria-pressed={lengthMode === mode} className={lengthMode === mode ? "rounded-lg border border-success bg-[color-mix(in_srgb,var(--success),transparent_90%)] p-3 text-left text-sm font-semibold" : "rounded-lg border border-border p-3 text-left text-sm"} key={mode} type="button" onClick={() => setLengthMode(mode)}>{label}</button>
              ))}
            </div>
            {lengthMode === "exact" ? (
              <div className="grid gap-3 rounded-lg border border-border p-3">
                <label className="flex items-start gap-2 text-sm"><input checked={copyTextFamilyTarget} className="mt-1" type="checkbox" onChange={(event) => setCopyTextFamilyTarget(event.currentTarget.checked)} /><span><span className="font-semibold text-foreground">Одинаковая цель для Telegram, MAX и VK</span><span className="block text-xs leading-5 text-muted">Каждая версия всё равно хранится отдельно.</span></span></label>
                {!copyTextFamilyTarget ? <label className="grid gap-1 text-sm font-semibold">Площадка<select className="h-11 rounded-lg border border-border bg-background px-3" value={exactPlatform} onChange={(event) => setExactPlatform(event.currentTarget.value as PlatformKey)}>{selectedPlatforms.map((key) => <option key={key} value={key}>{platformLabel(key)}</option>)}</select></label> : null}
                <div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-sm">От<input className="h-11 rounded-lg border border-border bg-background px-3" min={1} type="number" value={exactMinChars} onChange={(event) => setExactMinChars(event.currentTarget.value)} /></label><label className="grid gap-1 text-sm">До<input className="h-11 rounded-lg border border-border bg-background px-3" min={1} type="number" value={exactMaxChars} onChange={(event) => setExactMaxChars(event.currentTarget.value)} /></label></div>
                {copyTextFamilyTarget && Number(exactMaxChars) > 4000 ? <p className="text-sm text-danger">Для MAX укажите не больше 4 000 знаков.</p> : null}
              </div>
            ) : null}
            <Button disabled={lengthMode === "exact" && (!Number(exactMinChars) || !Number(exactMaxChars) || Number(exactMinChars) > Number(exactMaxChars) || (copyTextFamilyTarget && Number(exactMaxChars) > 4000))} type="button" onClick={() => setLengthSheetOpen(false)}>Применить к текущему посту</Button>
          </section>
        </div>
      ) : null}

      <Card className="order-2 grid min-w-0 gap-4 overflow-hidden p-4 sm:p-6 lg:order-none lg:col-start-1 lg:row-start-2">
        <div className="order-1 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-lg font-semibold text-foreground">Ваш голосовой черновик</div>
            <span className="flex items-center gap-2 text-xs text-muted">
              <span className={captureState === "recording" ? "size-2 animate-pulse rounded-full bg-danger motion-reduce:animate-none" : "size-2 rounded-full bg-success"} />
              {captureState === "recording"
                ? voiceSignalDetected ? "Микрофон слышит вас" : "Идёт запись — говорите"
                : captureState === "paused" ? "Запись на паузе" : "Можно продолжить в любой момент"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">Надиктуйте всё сразу или добавляйте фрагменты по очереди.</p>
        </div>
        <div className="order-2 flex justify-center border-t border-border pt-5 lg:order-3">
          <button
            aria-label={captureState === "recording" || captureState === "paused" ? "Остановить и сохранить фрагмент" : "Начать диктовку"}
            aria-pressed={captureState === "recording" || captureState === "paused"}
            className="grid size-28 place-items-center rounded-full bg-accent text-accent-foreground shadow-popover transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 sm:size-32"
            disabled={["requesting", "uploading", "transcribing", "review"].includes(captureState)}
            id="voice-record-button"
            type="button"
            onClick={() => {
              if (captureState === "recording" || captureState === "paused") finishSegment();
              else void startRecording();
            }}
          >
            {captureState === "requesting" || captureState === "uploading" || captureState === "transcribing" ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" size={36} />
            ) : captureState === "recording" || captureState === "paused" ? (
              <span aria-hidden="true" className="grid place-items-center gap-2">
                <span className="flex h-10 items-center justify-center gap-1" data-testid="voice-level-bars">
                  {[0.48, 0.78, 1, 0.66, 0.9, 0.58, 0.74].map((weight, index) => (
                    <span
                      className="w-1.5 rounded-full bg-current transition-[height] duration-75 motion-reduce:transition-none"
                      key={`${weight}-${index}`}
                      style={{
                        height: captureState === "paused"
                          ? `${8 + Math.round(weight * 8)}px`
                          : `${8 + Math.round(weight * voiceLevel * 34)}px`,
                      }}
                    />
                  ))}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {captureState === "paused" ? "Пауза" : formatRecordingSeconds(recordingSeconds)}
                </span>
              </span>
            ) : (
              <Mic size={40} />
            )}
          </button>
        </div>
        {!contentId && !ideaBrief ? (
          <div className="order-3 flex min-w-0 justify-center lg:order-4">
            <Button asChild className="min-h-11 w-full sm:w-auto" variant="secondary">
              <Link href="/app/ideas"><Lightbulb size={17} />Не знаю, о чём рассказать</Link>
            </Button>
          </div>
        ) : null}
        <div className="order-4 flex flex-wrap justify-center gap-2">
          <Button className="min-h-11" disabled={captureState !== "recording"} size="sm" type="button" variant="secondary" onClick={pauseRecording}>
            <Pause size={15} />
            Пауза
          </Button>
          <Button className="min-h-11" disabled={captureState !== "paused"} size="sm" type="button" variant="secondary" onClick={continueRecording}>
            <Play size={15} />
            Продолжить
          </Button>
          <Button className="min-h-11" disabled={!["recording", "paused"].includes(captureState)} size="sm" type="button" onClick={finishSegment}>
            <CheckCircle2 size={15} />
            Закончить фрагмент
          </Button>
        </div>
        <div
          aria-live="polite"
          className={
            captureState === "error"
              ? "order-5 rounded-lg border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] p-3 text-sm leading-6 text-danger"
              : "order-5 rounded-lg border border-border bg-surface-muted p-3 text-sm leading-6 text-muted"
          }
        >
          {message}
        </div>

        {segments.length ? (
          <div className="order-6 grid gap-2">
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

        {ideaBrief ? (
          <section aria-labelledby="selected-idea-title" className="order-3 grid min-w-0 gap-3 rounded-xl border border-success/55 bg-[color-mix(in_srgb,var(--success),transparent_93%)] p-4" data-testid="selected-idea-brief">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge tone="success">Идея выбрана</Badge>
                <h2 className="mt-2 break-words text-lg font-semibold text-foreground" id="selected-idea-title">{ideaBrief.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{ideaBrief.angle}</p>
              </div>
              {pendingStandaloneIdea ? (
                <button aria-label="Убрать выбранную идею" className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted transition hover:bg-background hover:text-foreground" onClick={dismissStandaloneIdea} type="button"><X size={19} /></button>
              ) : <CheckCircle2 className="shrink-0 text-success" size={21} />}
            </div>
            <p className="rounded-lg border border-border bg-background p-3 text-sm leading-6 text-foreground">{ideaBrief.ideaBrief}</p>
            <p className="text-xs leading-5 text-muted"><strong className="text-foreground">{pendingStandaloneIdea ? "Вопрос для начала:" : "План:"}</strong> {ideaBrief.starterOutline}</p>
            <div>
              <div className="text-sm font-semibold text-foreground">Расскажите своими словами:</div>
              {ideaBrief.detailQuestions.length === 1 ? (
                <p className="mt-2 text-sm leading-6 text-muted">{ideaBrief.detailQuestions[0]}</p>
              ) : (
                <ol className="mt-2 grid gap-1.5 pl-5 text-sm leading-6 text-muted">
                  {ideaBrief.detailQuestions.map((question) => <li className="list-decimal" key={question}>{question}</li>)}
                </ol>
              )}
            </div>
            <p className="text-xs leading-5 text-muted">Идея не добавлена в расшифровку и не станет текстом поста сама. Здесь звучат ваши слова; ИИ подключится позже как редактор.</p>
          </section>
        ) : null}

        <label className="order-3 grid min-w-0 gap-2 text-sm font-semibold text-foreground lg:order-2">
          Общая расшифровка
          <span className="text-xs font-normal leading-5 text-muted">
            Говорите естественно: назовите важные факты, личный вывод и то, что нельзя потерять. Текст можно поправить вручную до сборки.
          </span>
          <textarea
            id="voice-transcript"
            className="min-h-40 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm font-normal leading-6 outline-none focus:border-primary"
            placeholder="Расшифровка всех фрагментов появится здесь. Можно также вставить текст вручную."
            value={transcript}
            onChange={(event) => updateTranscript(event.currentTarget.value)}
          />
        </label>
        <div className="order-7 flex min-w-0 flex-wrap gap-2">
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
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground">
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
        <div className="order-8 grid min-w-0 gap-3 rounded-xl border border-border bg-surface-muted p-4" data-testid="photo-upload-section">
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
                Добавьте фотографии или видео, если они нужны выбранному формату. До 10 файлов; первые 3 помогают ИИ понять контекст. Надписи и факты обязательно проверьте.
              </p>
            </div>
          </div>
          <label className="inline-flex h-11 w-fit cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground">
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
          className="order-9 h-12 w-full text-base lg:hidden"
          disabled={isAssembling || !transcript.trim() || !selectedPlatforms.length || !canUseApi || Boolean(instagramFormatIssue())}
          type="button"
          onClick={() => void assembleVersions()}
        >
          {isAssembling ? <Loader2 className="animate-spin" size={18} /> : <WandSparkles size={18} />}
          {resumeDraft ? "Пересобрать версии" : "Собрать версии"}
        </Button>
      </Card>
      </div>

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
                  className="min-h-11"
                  disabled={hasMechanicalPlatformTruncation(activeResult.variant)}
                  type="button"
                  onClick={() => void copyActive()}
                >
                  <Clipboard size={16} />
                  Копировать
                </Button>
                {editingPlatform === activePlatform ? (
                  <>
                    <Button className="min-h-11" disabled={isSavingVariant} type="button" variant="secondary" onClick={() => void saveVariantText(activePlatform, editRichText)}>
                      {isSavingVariant ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                      Сохранить
                    </Button>
                    <Button className="min-h-11" type="button" variant="ghost" onClick={() => setEditingPlatform(null)}>Отмена</Button>
                  </>
                ) : (
                  <Button
                    className="min-h-11"
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
                  className="min-h-11"
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
                  className="min-h-11"
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
                  className="min-h-11"
                  disabled={isRefining}
                  type="button"
                  variant="secondary"
                  onClick={() => void refineVariants(
                    "Убери рекламный пафос, общие громкие обещания и канцелярит. Сделай формулировки спокойнее и конкретнее, не меняя факты и вывод автора.",
                    "Без пафоса",
                  )}
                >
                  Без пафоса
                </Button>
                <Button
                  className="min-h-11"
                  disabled={isRefining || isAssembling}
                  type="button"
                  variant="secondary"
                  onClick={() => void assembleVersions({ rebuildFromSource: true })}
                >
                  {isAssembling ? <Loader2 className="animate-spin motion-reduce:animate-none" size={15} /> : <RotateCcw size={15} />}
                  Пересобрать из диктовки
                </Button>
              </div>
              <details className="group rounded-lg border border-border bg-surface-muted">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                  <span>Ещё правки</span><ChevronDown className="transition group-open:rotate-180 motion-reduce:transition-none" size={17} />
                </summary>
                <div className="grid gap-3 border-t border-border p-3">
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <Button className="min-h-11" disabled={isRefining} type="button" variant="secondary" onClick={() => void refineVariants(
                      "Добавь 2–4 уместные короткие шутки или образные формулировки из контекста материала. Не выдумывай события и не шути вместо фактов.",
                      "Больше юмора",
                    )}>Больше юмора</Button>
                    <Button className="min-h-11" disabled={isRefining} type="button" variant="secondary" onClick={() => void refineVariants(
                      "Убери все эмодзи и поправь пробелы после удаления. Остальной текст и факты сохрани.",
                      "Без эмодзи",
                    )}>Без эмодзи</Button>
                  </div>
                  <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <label className="grid gap-1 text-xs font-semibold text-muted">
                      Своя команда для {platformLabel(activePlatform)}
                      <input className="h-11 min-w-0 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground outline-none" placeholder="Например: сохрани цену, сократи вступление" value={instruction} onChange={(event) => setInstruction(event.currentTarget.value)} />
                    </label>
                    <Button className="min-h-11" disabled={isRefining || !instruction.trim()} type="button" variant="secondary" onClick={() => void refineVariants(instruction.trim(), "Команда")}>
                      {isRefining ? <Loader2 className="animate-spin motion-reduce:animate-none" size={15} /> : <WandSparkles size={15} />}Применить
                    </Button>
                  </div>
                  <label className="flex min-h-11 items-center gap-2 text-xs font-medium text-foreground">
                    <input checked={applyToAll} type="checkbox" onChange={(event) => setApplyToAll(event.currentTarget.checked)} />
                    Применить свою команду ко всем выбранным версиям
                  </label>
                </div>
              </details>
              <section className="grid min-w-0 gap-3 rounded-lg border border-border bg-surface-muted p-3" data-testid="platform-feedback">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Сохранить вашу окончательную редакцию?</h3>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      После ручной правки «Наговори» может использовать эту версию как удачный пример именно для {platformLabel(activePlatform)}.
                    </p>
                  </div>
                  {activeFeedback ? <Badge tone={activeFeedback.reaction === "excellent" ? "success" : activeFeedback.reaction === "good" ? "info" : "warning"}>
                    {activeFeedback.learns_style ? "стиль запомнен" : "реакция сохранена"}
                  </Badge> : null}
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  <Button
                    onClick={() => void setVariantFeedback("excellent", true)}
                    className="min-h-11"
                    type="button"
                    variant={activeFeedback?.reaction === "excellent" ? "primary" : "secondary"}
                  >
                    Запомнить эту редакцию для {platformLabel(activePlatform)}
                  </Button>
                  <details className="group min-w-0">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-3 text-sm font-medium text-muted hover:bg-background hover:text-foreground">Оценить результат<ChevronDown className="transition group-open:rotate-180 motion-reduce:transition-none" size={15} /></summary>
                    <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                      <Button className="min-h-11" onClick={() => void setVariantFeedback("good")} type="button" variant={activeFeedback?.reaction === "good" ? "primary" : "secondary"}>Хорошо</Button>
                      <Button className="min-h-11" onClick={() => void setVariantFeedback("needs_work")} type="button" variant={activeFeedback?.reaction === "needs_work" ? "primary" : "secondary"}>Нужна правка</Button>
                      <Button className="min-h-11" onClick={() => void setVariantFeedback("not_my_style")} type="button" variant={activeFeedback?.reaction === "not_my_style" ? "primary" : "secondary"}>Не мой стиль</Button>
                      {activeFeedback ? <Button className="min-h-11" onClick={() => void clearVariantFeedback()} type="button" variant="ghost">Снять оценку</Button> : null}
                    </div>
                  </details>
                </div>
              </section>
              {latestAiUsage ? (
                <details className="group rounded-lg border border-border bg-surface-muted" data-testid="ai-usage-meter">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-semibold text-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                    <span>Технические сведения об ИИ</span><ChevronDown className="transition group-open:rotate-180 motion-reduce:transition-none" size={17} />
                  </summary>
                  <div className="grid gap-2 border-t border-border p-3">
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
                </details>
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
