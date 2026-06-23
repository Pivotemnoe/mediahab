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
  type GuidedFormResponse,
  type GuidedFormUiField,
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

type Tone = "info" | "neutral" | "success" | "warning" | "danger";

export interface MaterialCaptureFlowViewModel {
  primaryOutput: string;
  sourceLabel: string;
  steps: Array<{
    helper: string;
    label: string;
    status: string;
    tone: Tone;
  }>;
  templateName: string;
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
  guidedForm: {
    canMutate: boolean;
    description: string;
    fields: GuidedFormFieldViewModel[];
    generatedFields: string[];
    itemVersion: number | null;
    limits: string;
    title: string;
  };
  inputBlocks: Array<{
    helper: string;
    name: string;
    source: string;
    status: string;
  }>;
  masterDraftParagraphs: string[];
  materialLabel: string;
  materialFlow: MaterialCaptureFlowViewModel;
  masterBudget: string;
  modeLabel: string;
  notice?: string;
  platformPreviews: Array<{
    budget: string;
    id: string;
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
  workspaceId: string | null;
}

export interface GuidedFormFieldViewModel {
  blockId: string | null;
  fieldKey: string;
  fields: GuidedFormFieldViewModel[];
  groupItems: Array<{
    fields: GuidedFormFieldViewModel[];
    label: string;
  }>;
  helper: string;
  inputKind: "checkbox" | "custom" | "input" | "media" | "number" | "readonly" | "select" | "textarea";
  key: string;
  label: string;
  locked: boolean;
  lockPolicy: boolean;
  maxItems?: number | null;
  minItems?: number | null;
  newItemFields: Array<{
    key: string;
    label: string;
    required: boolean;
    type: string;
    typeLabel: string;
  }>;
  required: boolean;
  source: string;
  status: string;
  statusTone: "info" | "neutral" | "success" | "warning" | "danger";
  type: string;
  typeLabel: string;
  value: string;
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
  materialFlow: MaterialCaptureFlowViewModel;
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

function placeReviewMaterialFlow(sourceLabel: string): MaterialCaptureFlowViewModel {
  return {
    primaryOutput: "Telegram: первая площадка",
    sourceLabel,
    templateName: "Обзор места",
    steps: [
      {
        label: "Место и адрес",
        helper: "Название, адрес, ориентир и чек фиксируются как факты.",
        status: "факты",
        tone: "success",
      },
      {
        label: "Медиа",
        helper: "Фото и видео прикрепляются к материалу до сборки версий.",
        status: "медиа",
        tone: "info",
      },
      {
        label: "Атмосфера",
        helper: "Обстановка, сервис, ожидание и важные наблюдения.",
        status: "сбор",
        tone: "info",
      },
      {
        label: "Блюда",
        helper: "Повторяемые позиции: название, цена, впечатления.",
        status: "сбор",
        tone: "info",
      },
      {
        label: "Итог",
        helper: "Вывод, кому подходит место и честные оговорки.",
        status: "сбор",
        tone: "warning",
      },
      {
        label: "ИИ-блоки",
        helper: "ИИ предлагает крючок, призыв к действию, оценки и собирает мастер-материал.",
        status: "после фактов",
        tone: "neutral",
      },
      {
        label: "Версии платформ",
        helper: "Мастер адаптируется отдельно под Telegram, MAX, Instagram и будущие площадки.",
        status: "после ИИ",
        tone: "neutral",
      },
      {
        label: "Публикация",
        helper: "Отправка остаётся ручной и выбирается отдельно для каждой платформы.",
        status: "подтверждение",
        tone: "neutral",
      },
    ],
  };
}

type GuidedBlockSource = Pick<
  BlockOut,
  "field_key" | "group_index" | "group_key" | "id" | "is_locked" | "source_type" | "transcript_text" | "value_json"
>;

const fixtureGuidedFields: GuidedFormUiField[] = [
  {
    fields: [
      { fact_locked: true, key: "venue_name", label: "Заведение", required: true, type: "short_text" },
      { fact_locked: true, key: "address", label: "Адрес", required: true, type: "address" },
      { fact_locked: true, key: "total_check", label: "Общий чек", required: false, type: "money" },
    ],
    key: "basic_info",
    label: "Заведение, адрес и чек",
    required: true,
    type: "object",
  },
  {
    description: "Посадка, музыка, ожидание, работа официантов и общее ощущение от места.",
    fact_locked: true,
    key: "atmosphere",
    label: "Атмосфера, сервис и обстановка",
    required: true,
    type: "voice_or_long_text",
  },
  {
    fields: [
      { fact_locked: true, key: "name", label: "Название", required: true, type: "short_text" },
      { fact_locked: true, key: "price", label: "Цена", required: false, type: "money" },
      {
        fact_locked: true,
        key: "observations",
        label: "Описание и впечатления",
        required: true,
        type: "voice_or_long_text",
      },
    ],
    key: "dishes",
    label: "Блюда, напитки и десерты",
    min_items: 1,
    repeatable: true,
    required: true,
    type: "repeatable_group",
  },
  {
    description: "Рекомендация, кому идти, главный вывод и честная оговорка.",
    fact_locked: true,
    key: "conclusion",
    label: "Итоговое впечатление",
    required: true,
    type: "voice_or_long_text",
  },
  {
    key: "media",
    label: "Фото и видео",
    repeatable: true,
    required: false,
    type: "media_picker",
  },
];

const fixtureGuidedBlocks: GuidedBlockSource[] = [
  {
    id: "fixture-venue",
    field_key: "venue_name",
    group_index: null,
    group_key: null,
    is_locked: true,
    source_type: "user_text",
    transcript_text: null,
    value_json: "ПуриПури",
  },
  {
    id: "fixture-address",
    field_key: "address",
    group_index: null,
    group_key: null,
    is_locked: true,
    source_type: "user_text",
    transcript_text: null,
    value_json: "Армавир, ул. Кирова, 27",
  },
  {
    id: "fixture-total-check",
    field_key: "total_check",
    group_index: null,
    group_key: null,
    is_locked: true,
    source_type: "user_text",
    transcript_text: null,
    value_json: "590 ₽ за сет, отдельные позиции в основном обзоре",
  },
  {
    id: "fixture-atmosphere",
    field_key: "atmosphere",
    group_index: null,
    group_key: null,
    is_locked: false,
    source_type: "transcription",
    transcript_text:
      "Внутри красиво, удобно, можно сесть в зале, у детской или во дворике. Сервис старается, но организации не хватает.",
    value_json: {
      text: "Внутри красиво, удобно, можно сесть в зале, у детской или во дворике. Сервис старается, но организации не хватает.",
    },
  },
  {
    id: "fixture-dish-name",
    field_key: "name",
    group_index: 0,
    group_key: "dishes",
    is_locked: true,
    source_type: "user_text",
    transcript_text: null,
    value_json: "Хачапури на мангале",
  },
  {
    id: "fixture-dish-price",
    field_key: "price",
    group_index: 0,
    group_key: "dishes",
    is_locked: true,
    source_type: "user_text",
    transcript_text: null,
    value_json: "в составе сета 590 ₽",
  },
  {
    id: "fixture-dish-observations",
    field_key: "observations",
    group_index: 0,
    group_key: "dishes",
    is_locked: true,
    source_type: "voice",
    transcript_text: null,
    value_json:
      "Хорошая корочка, полностью расплавленный сулугуни, температура удачная. Эту позицию можно брать ещё раз.",
  },
  {
    id: "fixture-conclusion",
    field_key: "conclusion",
    group_index: null,
    group_key: null,
    is_locked: false,
    source_type: "user_text",
    transcript_text: null,
    value_json: "",
  },
];

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
    user_input: "ручной ввод",
    user_text: "текст",
    voice: "голос",
  };
  return labels[sourceType] ?? sourceType;
}

function fieldTypeLabel(fieldType: string): string {
  const labels: Record<string, string> = {
    address: "адрес",
    boolean: "да/нет",
    custom_block: "кастомный блок",
    date_time: "дата и время",
    long_text: "длинный текст",
    media_picker: "медиа",
    money: "деньги",
    multi_select: "мультивыбор",
    number: "число",
    object: "группа полей",
    rating: "оценка",
    repeatable_group: "повторяемый блок",
    select: "выбор",
    short_text: "короткий текст",
    voice: "голос",
    voice_or_long_text: "голос или текст",
  };
  return labels[fieldType] ?? fieldType.replace(/_/g, " ");
}

function inputKind(fieldType: string): GuidedFormFieldViewModel["inputKind"] {
  if (fieldType === "voice" || fieldType === "voice_or_long_text" || fieldType === "long_text") {
    return "textarea";
  }
  if (fieldType === "number" || fieldType === "money" || fieldType === "rating") {
    return "number";
  }
  if (fieldType === "boolean") {
    return "checkbox";
  }
  if (fieldType === "select" || fieldType === "multi_select") {
    return "select";
  }
  if (fieldType === "media_picker") {
    return "media";
  }
  if (fieldType === "object" || fieldType === "repeatable_group") {
    return "readonly";
  }
  if (fieldType === "custom_block") {
    return "custom";
  }
  return "input";
}

function generatedFieldLabel(fieldKey: string): string {
  const labels: Record<string, string> = {
    cta: "Призыв к действию",
    hook: "Хук",
    master_text: "Мастер-текст",
    platform_variants: "Варианты площадок",
    ranking_summary: "Сводка рейтинга",
    ratings: "Оценки",
    transitions: "Переходы",
  };
  return labels[fieldKey] ?? fieldLabel(fieldKey);
}

function editorialLimitsLabel(limits: GuidedFormResponse["editorial_limits"]): string {
  const min = limits.min_chars;
  const max = limits.max_chars;
  if (typeof min === "number" && typeof max === "number") {
    return `${new Intl.NumberFormat("ru-RU").format(min)}-${new Intl.NumberFormat("ru-RU").format(max)} знаков`;
  }
  if (typeof max === "number") {
    return `до ${new Intl.NumberFormat("ru-RU").format(max)} знаков`;
  }
  if (typeof min === "number") {
    return `от ${new Intl.NumberFormat("ru-RU").format(min)} знаков`;
  }
  return "лимит не задан";
}

function blockForField(
  blocks: GuidedBlockSource[],
  fieldKey: string,
  groupKey: string | null,
  groupIndex: number | null,
): GuidedBlockSource | undefined {
  return blocks.find(
    (block) =>
      block.field_key === fieldKey &&
      (block.group_key ?? null) === groupKey &&
      (block.group_index ?? null) === groupIndex,
  );
}

function blockDisplayValue(block: GuidedBlockSource | undefined): string {
  if (!block) {
    return "";
  }
  return block.transcript_text || valueText(block.value_json);
}

function groupIndexes(blocks: GuidedBlockSource[], groupKey: string, minItems: number | null | undefined): number[] {
  const indexes = Array.from(
    new Set(
      blocks
        .filter((block) => block.group_key === groupKey && block.group_index !== null)
        .map((block) => block.group_index as number),
    ),
  ).sort((left, right) => left - right);

  if (indexes.length) {
    return indexes;
  }
  return minItems && minItems > 0 ? [0] : [];
}

function guidedFieldStatus(
  field: GuidedFormUiField,
  block: GuidedBlockSource | undefined,
  value: string,
  groupItemsCount: number,
): Pick<GuidedFormFieldViewModel, "status" | "statusTone"> {
  if (field.type === "repeatable_group") {
    if (groupItemsCount > 0) {
      return { status: `${groupItemsCount} позиция`, statusTone: "info" };
    }
    return field.required ? { status: "нужна позиция", statusTone: "warning" } : { status: "опционально", statusTone: "neutral" };
  }
  if (field.type === "object") {
    return { status: "секция", statusTone: "info" };
  }
  if (block?.is_locked) {
    return { status: "зафиксировано", statusTone: "success" };
  }
  if (value.trim()) {
    return { status: "черновик", statusTone: "info" };
  }
  if (field.required) {
    return { status: "требуется", statusTone: "warning" };
  }
  return { status: "опционально", statusTone: "neutral" };
}

function guidedFieldView(
  field: GuidedFormUiField,
  blocks: GuidedBlockSource[],
  context: { groupIndex: number | null; groupKey: string | null } = { groupIndex: null, groupKey: null },
): GuidedFormFieldViewModel {
  const nestedFields = field.fields ?? [];
  const fieldGroupIndexes =
    field.type === "repeatable_group" ? groupIndexes(blocks, field.key, field.min_items) : [];
  const block = field.type === "repeatable_group" || field.type === "object"
    ? undefined
    : blockForField(blocks, field.key, context.groupKey, context.groupIndex);
  const value = blockDisplayValue(block);
  const groupItems = field.type === "repeatable_group"
    ? fieldGroupIndexes.map((groupIndex) => ({
        fields: nestedFields.map((child) =>
          guidedFieldView(child, blocks, {
            groupIndex,
            groupKey: field.key,
          }),
        ),
        label: `${field.label} ${groupIndex + 1}`,
      }))
    : [];
  const status = guidedFieldStatus(field, block, value, groupItems.length);

  return {
    blockId: block?.id ?? null,
    fieldKey: field.key,
    fields: field.type === "object"
      ? nestedFields.map((child) => guidedFieldView(child, blocks))
      : [],
    groupItems,
    helper: field.description ?? (field.required ? "Обязательное фактическое поле." : "Можно заполнить позже."),
    inputKind: inputKind(field.type),
    key: context.groupKey ? `${context.groupKey}.${context.groupIndex ?? 0}.${field.key}` : field.key,
    label: field.label,
    locked: Boolean(block?.is_locked),
    lockPolicy: Boolean(field.fact_locked),
    maxItems: field.max_items,
    minItems: field.min_items,
    newItemFields: field.type === "repeatable_group"
      ? nestedFields.map((child) => ({
          key: child.key,
          label: child.label,
          required: Boolean(child.required),
          type: child.type,
          typeLabel: fieldTypeLabel(child.type),
        }))
      : [],
    required: Boolean(field.required),
    source: sourceLabel(block?.source_type ?? String(field.source ?? "user_input")),
    type: field.type,
    typeLabel: fieldTypeLabel(field.type),
    value,
    ...status,
  };
}

function guidedFormView(
  params: {
    blocks: GuidedBlockSource[];
    canMutate: boolean;
    editorialLimits: GuidedFormResponse["editorial_limits"];
    fields: GuidedFormUiField[];
    generatedFields: string[];
    itemVersion: number | null;
  },
): ContentStudioViewModel["guidedForm"] {
  return {
    canMutate: params.canMutate,
    description:
      params.canMutate
        ? "Поля построены из активной версии рубрики. Сохранение идёт через сервер с CSRF и проверкой версии материала."
        : "Поля построены из активной версии рубрики. В демо-режиме сохранение отключено.",
    fields: params.fields.map((field) => guidedFieldView(field, params.blocks)),
    generatedFields: params.generatedFields.map(generatedFieldLabel),
    itemVersion: params.itemVersion,
    limits: editorialLimitsLabel(params.editorialLimits),
    title: "Фактическая форма рубрики",
  };
}

function fixtureGuidedForm(): ContentStudioViewModel["guidedForm"] {
  return guidedFormView({
    blocks: fixtureGuidedBlocks,
    canMutate: false,
    editorialLimits: { max_chars: 4100, min_chars: 3500 },
    fields: fixtureGuidedFields,
    generatedFields: ["hook", "transitions", "ratings", "cta", "master_text", "platform_variants"],
    itemVersion: null,
  });
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

function latestVariantsByPlatform(variants: PlatformVariantOut[]): PlatformVariantOut[] {
  const latest = new Map<string, PlatformVariantOut>();
  for (const variant of variants) {
    const current = latest.get(variant.platform_key);
    if (!current || variant.revision_number > current.revision_number) {
      latest.set(variant.platform_key, variant);
    }
  }
  return Array.from(latest.values()).sort((left, right) => left.platform_key.localeCompare(right.platform_key));
}

function stringFromJson(object: Record<string, unknown>, key: string): string | null {
  const value = object[key];
  return typeof value === "string" ? value : null;
}

function fixtureContentIndex(): ContentIndexViewModel {
  return {
    items: fixtureItems.map((item) => item),
    modeLabel: "демо",
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
    guidedForm: fixtureGuidedForm(),
    inputBlocks: inputBlocks.map(([name, status, helper, source]) => ({
      helper,
      name,
      source,
      status,
    })),
    materialFlow: placeReviewMaterialFlow(studioSummary.rubric),
    masterBudget: "3 860 / 4 096",
    masterDraftParagraphs: [...masterDraftParagraphs],
    materialLabel: contentId,
    modeLabel: "демо",
    platformPreviews: platformPreviews.map((preview) => ({ ...preview })),
    revisionEvents: revisionEvents.map(([version, event, time]) => ({ event, time, version })),
    summary: { ...studioSummary },
    transcriptReview: { ...transcriptReview },
    workspaceId: null,
  };
}

function fixtureNewContent(): NewContentViewModel {
  return {
    activeCaptureBlock: { ...activeCaptureBlock },
    captureSteps: captureSteps.map(([step, status]) => ({ status, step })),
    compactPreviews: compactPreviews.map(([platform, status, note]) => ({ note, platform, status })),
    contextLabel: "Что поесть? Армавир · Обзор недели",
    materialFlow: placeReviewMaterialFlow("Обзор недели"),
    modeLabel: "демо",
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
  const [rubricNames, guidedFormResponse, blocksResponse, variantsResponse] = await Promise.all([
    rubricNameMap(item.project_id),
    safeApiGet<GuidedFormResponse>(`/api/v1/content-items/${contentId}/guided-form`),
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
    guidedFormResponse ? null : "Форма рубрики из API недоступна.",
    blocksResponse ? null : "Блоки материала из API недоступны.",
    variantsResponse ? null : "Платформенные превью из API недоступны.",
    "История версий пока показана демо-данными: сервер ещё не отдаёт список редакций материала.",
  ].filter(Boolean);
  const rubricLabel = rubricNames.get(item.rubric_id) ?? "Рубрика";

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
    guidedForm: guidedFormResponse
      ? guidedFormView({
          blocks,
          canMutate: true,
          editorialLimits: guidedFormResponse.editorial_limits,
          fields: guidedFormResponse.ui_schema.fields ?? [],
          generatedFields: guidedFormResponse.generated_fields,
          itemVersion: item.version,
        })
      : fallback.guidedForm,
    inputBlocks: blocks.length
      ? blocks.map((block) => ({
          helper: truncateText(valueText(block.value_json) || "Значение пока не заполнено.", 120),
          name: blockName(block),
          source: sourceLabel(block.source_type),
          status: blockStatus(block),
        }))
      : fallback.inputBlocks,
    materialLabel: item.id,
    materialFlow: placeReviewMaterialFlow(rubricLabel),
    masterBudget: variants[0] ? `${variants[0].character_count} знаков` : fallback.masterBudget,
    masterDraftParagraphs: textBlocks.length ? textBlocks : fallback.masterDraftParagraphs,
    modeLabel: "api",
    notice: notices.length ? `${notices.join(" ")} Панели без серверного чтения показаны демо-данными.` : undefined,
    platformPreviews: variants.length
      ? latestVariantsByPlatform(variants).map((variant) => ({
          budget: `${variant.character_count} знаков`,
          id: variant.id,
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
      range: guidedFormResponse
        ? editorialLimitsLabel(guidedFormResponse.editorial_limits)
        : fallback.summary.range,
      project: project?.id === item.project_id ? project.name : "Проект",
      revision: `v${item.version}`,
      rubric: rubricLabel,
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
    workspaceId: item.workspace_id,
  };
}

async function apiNewContent(): Promise<NewContentViewModel> {
  const fallback = fixtureNewContent();
  const project = await firstWorkspaceProject();
  if (!project) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "Проект для пилота не найден. Нажмите создание черновика: система подготовит тестовый проект, если это разрешено вашей сессией.",
    };
  }

  const rubrics = await rubricsForProject(project.id);
  const rubricName = rubrics[0]?.name ?? "рубрика не выбрана";
  return {
    ...fallback,
    contextLabel: `${project.name} · ${rubricName}`,
    materialFlow: placeReviewMaterialFlow(rubricName),
    modeLabel: "api",
    notice: "Это старт пилота. Реальная запись, фото, ИИ-сборка и публикация откроются после создания черновика.",
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
      modeLabel: "демо после ошибки API",
      notice: "API-режим включён, но сервер недоступен. Показаны демо-данные.",
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
      modeLabel: "демо после ошибки API",
      notice: "API-режим включён, но сервер недоступен. Показаны демо-данные.",
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
      modeLabel: "демо после ошибки API",
      notice: "API-режим включён, но сервер недоступен. Показаны демо-данные.",
    };
  }
}
