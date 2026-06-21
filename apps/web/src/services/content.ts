import {
  aiSuggestions,
  factLocks,
  inputBlocks,
  masterDraftParagraphs,
  platformPreviews,
  revisionEvents,
  studioSummary,
  transcriptReview,
} from "@/features/content-studio/content-studio-fixtures";
import {
  activeCaptureBlock,
  captureSteps,
  compactPreviews,
  offlineDraft,
  recordingStates,
  resumeItems,
  reviewBlocks,
} from "@/features/mobile-capture/mobile-capture-fixtures";
import {
  type BlockOut,
  type BlocksResponse,
  type ContentItemOut,
  type ContentListResponse,
  type MeResponse,
  type PlatformVariantOut,
  type PlatformVariantsResponse,
  type ProjectListResponse,
  type ProjectOut,
  type RubricOut,
  type RubricListResponse,
} from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

export interface ContentIndexViewModel {
  items: Array<{
    href: string;
    project: string;
    rubric: string;
    status: string;
    title: string;
    version: string;
  }>;
  modeLabel: string;
  notice?: string;
}

export interface ContentStudioViewModel {
  aiSuggestions: Array<{
    action: string;
    name: string;
    text: string;
  }>;
  checks: Array<{
    label: string;
    tone: "success" | "warning";
    value: string;
  }>;
  factLocks: Array<{
    fact: string;
    source: string;
    status: string;
  }>;
  inputBlocks: Array<{
    helper: string;
    name: string;
    source: string;
    status: string;
  }>;
  masterDraftParagraphs: string[];
  materialLabel: string;
  masterBudget: string;
  modeLabel: string;
  notice?: string;
  platformPreviews: Array<{
    budget: string;
    media: string;
    mode: string;
    platform: string;
    status: string;
    warning: string;
  }>;
  revisionEvents: Array<{
    event: string;
    time: string;
    version: string;
  }>;
  summary: {
    autosave: string;
    lockedFacts: string;
    project: string;
    range: string;
    revision: string;
    rubric: string;
    status: string;
    title: string;
  };
  transcriptReview: {
    confidence: string;
    duration: string;
    provider: string;
    status: string;
    text: string;
  };
}

export interface NewContentViewModel {
  activeCaptureBlock: {
    duration: string;
    progress: string;
    prompt: string;
    title: string;
    transcript: string;
  };
  captureSteps: Array<{
    status: string;
    step: string;
  }>;
  compactPreviews: Array<{
    note: string;
    platform: string;
    status: string;
  }>;
  contextLabel: string;
  modeLabel: string;
  notice?: string;
  offlineDraft: {
    queue: string;
    saved: string;
    status: string;
  };
  recordingStates: Array<{
    label: string;
    state: string;
  }>;
  resumeItems: Array<{
    label: string;
    value: string;
  }>;
  reviewBlocks: Array<{
    name: string;
    status: string;
    text: string;
  }>;
}

const fixtureItems = [
  {
    href: "/app/content/demo-lunch",
    title: "Старый город, бизнес-ланч",
    project: "Что поесть? Армавир",
    rubric: "Поесть до 500 рублей",
    status: "сбор фактов",
    version: "v4",
  },
  {
    href: "/app/content/demo-review",
    title: "ПуриПури, сет за 590 ₽",
    project: "Что поесть? Армавир",
    rubric: "Обзор недели",
    status: "готово к сборке",
    version: "v7",
  },
] as const;

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    archived: "архив",
    collecting: "сбор фактов",
    draft: "черновик",
    published: "опубликовано",
    ready_for_ai: "готово к ИИ",
  };
  return labels[status] ?? status;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "обновлено недавно";
  }

  return `обновлено ${new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Moscow",
  }).format(date)}`;
}

function truncateText(value: string, maxLength = 180): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function valueText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(valueText).filter(Boolean).join("; ");
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    for (const key of ["text", "title", "value", "name", "summary"]) {
      if (typeof object[key] === "string") {
        return object[key];
      }
    }
    return Object.entries(object)
      .slice(0, 4)
      .map(([key, item]) => `${fieldLabel(key)}: ${valueText(item)}`)
      .join("; ");
  }
  return "";
}

function fieldLabel(fieldKey: string): string {
  const labels: Record<string, string> = {
    address: "Адрес",
    atmosphere: "Атмосфера",
    conclusion: "Итог",
    dish: "Блюдо",
    dishes: "Блюда",
    hook: "Хук",
    price: "Цена",
    ratings: "Оценки",
    service: "Сервис",
    total_check: "Чек",
    venue: "Заведение",
    venue_name: "Заведение",
  };
  const normalized = fieldKey.toLowerCase();
  return labels[normalized] ?? normalized.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function sourceLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    ai_suggested: "ИИ",
    import: "импорт",
    system: "система",
    transcription: "расшифровка",
    user_text: "текст",
    voice: "голос",
  };
  return labels[sourceType] ?? sourceType;
}

function blockStatus(block: BlockOut): string {
  if (block.is_locked) {
    return "готово";
  }
  if (block.source_type === "voice" || block.source_type === "transcription") {
    return "активно";
  }
  return valueText(block.value_json) ? "черновик" : "ожидает";
}

function blockName(block: BlockOut): string {
  if (!block.group_key) {
    return fieldLabel(block.field_key);
  }
  const groupIndex = block.group_index !== null ? block.group_index + 1 : 1;
  return `${fieldLabel(block.group_key)} ${groupIndex}: ${fieldLabel(block.field_key)}`;
}

function variantStatus(status: string): string {
  const labels: Record<string, string> = {
    approved: "готово к публикации",
    draft: "черновик",
    invalid: "нужна правка",
    manual_required: "нужен ручной экспорт",
    ready: "готово к проверке",
    ready_for_review: "готово к проверке",
    rejected: "отклонено",
    valid: "готово к проверке",
  };
  return labels[status] ?? statusLabel(status);
}

function platformLabel(platformKey: string): string {
  const labels: Record<string, string> = {
    instagram: "Instagram",
    max: "MAX",
    telegram: "Telegram",
  };
  return labels[platformKey] ?? platformKey;
}

function validationMessages(variant: PlatformVariantOut): string[] {
  const warnings = variant.validation.warnings;
  const errors = variant.validation.errors;
  return [
    ...(Array.isArray(warnings) ? warnings.map(String) : []),
    ...(Array.isArray(errors) ? errors.map(String) : []),
  ];
}

function stringFromJson(object: Record<string, unknown>, key: string): string | null {
  const value = object[key];
  return typeof value === "string" ? value : null;
}

function fixtureContentIndex(): ContentIndexViewModel {
  return {
    items: fixtureItems.map((item) => item),
    modeLabel: "fixtures",
  };
}

function fixtureContentStudio(contentId: string): ContentStudioViewModel {
  return {
    aiSuggestions: aiSuggestions.map(([name, text, action]) => ({ action, name, text })),
    checks: [
      { label: "Ошибки", tone: "success", value: "0" },
      { label: "Предупреждения", tone: "warning", value: "2" },
      { label: "Готовность", tone: "warning", value: "нужна проверка MAX" },
    ],
    factLocks: factLocks.map(([fact, status, source]) => ({ fact, source, status })),
    inputBlocks: inputBlocks.map(([name, status, helper, source]) => ({
      helper,
      name,
      source,
      status,
    })),
    masterBudget: "3 860 / 4 096",
    masterDraftParagraphs: [...masterDraftParagraphs],
    materialLabel: contentId,
    modeLabel: "fixtures",
    platformPreviews: platformPreviews.map((preview) => ({ ...preview })),
    revisionEvents: revisionEvents.map(([version, event, time]) => ({ event, time, version })),
    summary: { ...studioSummary },
    transcriptReview: { ...transcriptReview },
  };
}

function fixtureNewContent(): NewContentViewModel {
  return {
    activeCaptureBlock: { ...activeCaptureBlock },
    captureSteps: captureSteps.map(([step, status]) => ({ status, step })),
    compactPreviews: compactPreviews.map(([platform, status, note]) => ({ note, platform, status })),
    contextLabel: "Что поесть? Армавир · Обзор недели",
    modeLabel: "fixtures",
    offlineDraft: { ...offlineDraft },
    recordingStates: recordingStates.map(([state, label]) => ({ label, state })),
    resumeItems: resumeItems.map(([label, value]) => ({ label, value })),
    reviewBlocks: reviewBlocks.map(([name, status, text]) => ({ name, status, text })),
  };
}

async function firstWorkspaceProject(): Promise<ProjectOut | null> {
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];
  if (!workspace) {
    return null;
  }

  const projectsResponse = await safeApiGet<ProjectListResponse>(`/api/v1/workspaces/${workspace.id}/projects`);
  return projectsResponse?.projects[0] ?? null;
}

async function rubricNameMap(projectId: string): Promise<Map<string, string>> {
  const rubricsResponse = await safeApiGet<RubricListResponse>(`/api/v1/projects/${projectId}/rubrics`);
  return new Map((rubricsResponse?.rubrics ?? []).map((rubric) => [rubric.id, rubric.name]));
}

async function rubricsForProject(projectId: string): Promise<RubricOut[]> {
  const rubricsResponse = await safeApiGet<RubricListResponse>(`/api/v1/projects/${projectId}/rubrics`);
  return rubricsResponse?.rubrics ?? [];
}

function contentItemView(
  item: ContentItemOut,
  projectName: string,
  rubricNames: Map<string, string>,
): ContentIndexViewModel["items"][number] {
  return {
    href: `/app/content/${item.id}`,
    project: projectName,
    rubric: rubricNames.get(item.rubric_id) ?? "Рубрика",
    status: statusLabel(item.status),
    title: item.title_internal,
    version: `v${item.version}`,
  };
}

async function apiContentIndex(): Promise<ContentIndexViewModel> {
  const fallback = fixtureContentIndex();
  const project = await firstWorkspaceProject();

  if (!project) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "API-режим включён, но активный проект не найден. Показаны демо-данные.",
    };
  }

  const [contentResponse, rubricNames] = await Promise.all([
    safeApiGet<ContentListResponse>(`/api/v1/projects/${project.id}/content-items`),
    rubricNameMap(project.id),
  ]);
  const items = contentResponse?.content_items ?? [];

  return {
    ...fallback,
    items: items.length
      ? items.map((item) => contentItemView(item, project.name, rubricNames))
      : fallback.items,
    modeLabel: "api",
    notice: contentResponse ? undefined : "Список материалов из API недоступен. Показаны демо-данные.",
  };
}

async function apiContentStudio(contentId: string): Promise<ContentStudioViewModel> {
  const fallback = fixtureContentStudio(contentId);
  const item = await safeApiGet<ContentItemOut>(`/api/v1/content-items/${contentId}`);

  if (!item) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "Материал из API недоступен. Показаны демо-данные студии.",
    };
  }

  const project = await firstWorkspaceProject();
  const [rubricNames, blocksResponse, variantsResponse] = await Promise.all([
    rubricNameMap(item.project_id),
    safeApiGet<BlocksResponse>(`/api/v1/content-items/${contentId}/blocks`),
    safeApiGet<PlatformVariantsResponse>(`/api/v1/content-items/${contentId}/variants`),
  ]);
  const blocks = blocksResponse?.blocks ?? [];
  const variants = variantsResponse?.variants ?? [];
  const lockedBlocks = blocks.filter((block) => block.is_locked);
  const transcriptBlock = blocks.find((block) => block.transcript_text);
  const textBlocks = blocks
    .map((block) => truncateText(valueText(block.value_json), 260))
    .filter(Boolean)
    .slice(0, 3);
  const errorCount = variants.reduce((count, variant) => {
    const errors = variant.validation.errors;
    return count + (Array.isArray(errors) ? errors.length : 0);
  }, 0);
  const warningCount = variants.reduce((count, variant) => {
    const warnings = variant.validation.warnings;
    return count + (Array.isArray(warnings) ? warnings.length : 0);
  }, 0);
  const notices = [
    blocksResponse ? null : "Блоки материала из API недоступны.",
    variantsResponse ? null : "Платформенные превью из API недоступны.",
    "История версий пока fallback: backend не даёт list endpoint для content revisions.",
  ].filter(Boolean);

  return {
    aiSuggestions: fallback.aiSuggestions,
    checks: variantsResponse
      ? [
          { label: "Ошибки", tone: errorCount ? "warning" : "success", value: String(errorCount) },
          { label: "Предупреждения", tone: warningCount ? "warning" : "success", value: String(warningCount) },
          {
            label: "Готовность",
            tone: variants.some((variant) => variant.status === "approved") ? "success" : "warning",
            value: variants.length ? `${variants.length} вариант(а)` : "варианты не собраны",
          },
        ]
      : fallback.checks,
    factLocks: lockedBlocks.length
      ? lockedBlocks.map((block) => ({
          fact: truncateText(valueText(block.value_json) || fieldLabel(block.field_key), 120),
          source: sourceLabel(block.source_type),
          status: "locked",
        }))
      : fallback.factLocks,
    inputBlocks: blocks.length
      ? blocks.map((block) => ({
          helper: truncateText(valueText(block.value_json) || "Значение пока не заполнено.", 120),
          name: blockName(block),
          source: sourceLabel(block.source_type),
          status: blockStatus(block),
        }))
      : fallback.inputBlocks,
    materialLabel: item.id,
    masterBudget: variants[0] ? `${variants[0].character_count} знаков` : fallback.masterBudget,
    masterDraftParagraphs: textBlocks.length ? textBlocks : fallback.masterDraftParagraphs,
    modeLabel: "api",
    notice: notices.length ? `${notices.join(" ")} Панели без read endpoint показаны fallback-данными.` : undefined,
    platformPreviews: variants.length
      ? variants.map((variant) => ({
          budget: `${variant.character_count} знаков`,
          media: stringFromJson(variant.payload, "media") ?? "медиа по правилам площадки",
          mode: stringFromJson(variant.payload, "mode") ?? "вариант публикации",
          platform: platformLabel(variant.platform_key),
          status: variantStatus(variant.status),
          warning: validationMessages(variant)[0] ?? `Версия варианта v${variant.revision_number}`,
        }))
      : fallback.platformPreviews,
    revisionEvents: fallback.revisionEvents,
    summary: {
      ...fallback.summary,
      autosave: formatUpdatedAt(item.updated_at),
      project: project?.id === item.project_id ? project.name : "Проект",
      revision: `v${item.version}`,
      rubric: rubricNames.get(item.rubric_id) ?? "Рубрика",
      status: statusLabel(item.status),
      title: item.title_internal,
      lockedFacts: lockedBlocks.length ? `${lockedBlocks.length} зафиксировано` : fallback.summary.lockedFacts,
    },
    transcriptReview: transcriptBlock?.transcript_text
      ? {
          confidence: "нет оценки",
          duration: `блок v${transcriptBlock.revision_number}`,
          provider: "OpenAI STT",
          status: transcriptBlock.is_locked ? "принято" : "готово к проверке",
          text: transcriptBlock.transcript_text,
        }
      : fallback.transcriptReview,
  };
}

async function apiNewContent(): Promise<NewContentViewModel> {
  const fallback = fixtureNewContent();
  const project = await firstWorkspaceProject();
  if (!project) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "API-режим включён, но проект не найден. Показаны демо-данные мобильной диктовки.",
    };
  }

  const rubrics = await rubricsForProject(project.id);
  return {
    ...fallback,
    contextLabel: `${project.name} · ${rubrics[0]?.name ?? "рубрика не выбрана"}`,
    modeLabel: "api",
    notice: "Создание материала и live-запись пока не подключены к API. Показан технический mobile-capture сценарий.",
  };
}

export async function getContentIndexViewModel(): Promise<ContentIndexViewModel> {
  if (getDataMode() !== "api") {
    return fixtureContentIndex();
  }

  try {
    return await apiContentIndex();
  } catch {
    return {
      ...fixtureContentIndex(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}

export async function getContentStudioViewModel(contentId: string): Promise<ContentStudioViewModel> {
  if (getDataMode() !== "api") {
    return fixtureContentStudio(contentId);
  }

  try {
    return await apiContentStudio(contentId);
  } catch {
    return {
      ...fixtureContentStudio(contentId),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}

export async function getNewContentViewModel(): Promise<NewContentViewModel> {
  if (getDataMode() !== "api") {
    return fixtureNewContent();
  }

  try {
    return await apiNewContent();
  } catch {
    return {
      ...fixtureNewContent(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}
