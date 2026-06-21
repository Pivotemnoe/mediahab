import {
  type ContentListResponse,
  type ExampleListResponse,
  type ExampleOut,
  type MeResponse,
  type ProjectListResponse,
  type ProjectOut,
  type RubricListResponse,
} from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

export interface AiPipelineViewModel {
  context: {
    content: string;
    project: string;
  };
  examples: ExamplePreviewViewModel[];
  factGuards: string[];
  modeLabel: string;
  notice?: string;
  runs: AiRunViewModel[];
  steps: AiStepViewModel[];
}

export interface ProjectExamplesViewModel {
  examples: ExamplePreviewViewModel[];
  metrics: Array<{
    label: string;
    note: string;
    value: string;
  }>;
  modeLabel: string;
  notice?: string;
  projectLabel: string;
}

export interface AiStepViewModel {
  status: string;
  text: string;
  title: string;
}

export interface AiRunViewModel {
  provider: string;
  status: string;
  task: string;
}

export interface ExamplePreviewViewModel {
  fragments: string;
  rubric: string;
  score: string;
  status: string;
  title: string;
}

const fallbackSteps: AiStepViewModel[] = [
  {
    status: "готово",
    text: "Извлечение структуры из блоков и расшифровок",
    title: "Факты",
  },
  {
    status: "готово",
    text: "Выбор 3-8 одобренных примеров, а не всей библиотеки",
    title: "Примеры",
  },
  {
    status: "готово",
    text: "Сборка черновика с крючками, оценками и призывом к действию",
    title: "Мастер-текст",
  },
  {
    status: "готово",
    text: "Заблокированные факты, длина, рискованные неподтверждённые утверждения",
    title: "Проверка",
  },
];

const fallbackRuns: AiRunViewModel[] = [
  { provider: "OpenAI", status: "ждёт ключ", task: "Извлечение фактов" },
  { provider: "OpenAI", status: "ждёт ключ", task: "Сборка мастер-текста" },
  { provider: "OpenAI", status: "ждёт ключ", task: "Крючки" },
  { provider: "OpenAI", status: "ждёт ключ", task: "Оценки" },
  { provider: "OpenAI", status: "ждёт ключ", task: "Проверка качества" },
];

const fallbackExamples: ExamplePreviewViewModel[] = [
  {
    fragments: "сильный интерьер, слабая кухня",
    rubric: "Обзор недели",
    score: "8/9",
    status: "одобрено",
    title: "ПуриПури: интерьер спорит с кухней",
  },
  {
    fragments: "бизнес-ланч, цена, порции",
    rubric: "Поесть до 500 рублей",
    score: "9/9",
    status: "одобрено",
    title: "Старый город: бизнес-ланч без режима выживания",
  },
  {
    fragments: "вес, запах гари, сухая курица",
    rubric: "Фаст-обзор",
    score: "6/9",
    status: "проверка",
    title: "440 грамм за 250 ₽: вес есть, радости мало",
  },
];

const factGuards = [
  "Заведение, адрес, чек, блюдо и цена не меняются без блокирующей ошибки.",
  "Недостаток фактов даёт пустое значение или предупреждение, а не выдумку.",
  "Оценки пользователя имеют приоритет над предложениями ИИ.",
];

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    approved: "одобрено",
    archived: "архив",
    canceled: "отменено",
    completed: "готово",
    duplicate: "дубликат",
    failed: "ошибка",
    pending: "проверка",
    pending_review: "проверка",
    processing: "в работе",
    queued: "в очереди",
    rejected: "отклонено",
  };
  return labels[status] ?? status;
}

function scoreLabel(score: number | null): string {
  return score ? `${score}/9` : "без оценки";
}

function exampleTitle(example: ExampleOut): string {
  return example.title ?? `Пример ${example.id.slice(0, 8)}`;
}

function exampleFragments(example: ExampleOut): string {
  if (example.labels.length) {
    return example.labels.slice(0, 3).join(", ");
  }
  return `${example.character_count} знаков`;
}

function examplePreview(
  example: ExampleOut,
  rubricNames: Map<string, string>,
): ExamplePreviewViewModel {
  return {
    fragments: exampleFragments(example),
    rubric: example.rubric_id ? rubricNames.get(example.rubric_id) ?? "Рубрика" : "Без рубрики",
    score: scoreLabel(example.manual_quality_score),
    status: statusLabel(example.status),
    title: exampleTitle(example),
  };
}

function fixtureProjectExamples(projectId: string): ProjectExamplesViewModel {
  return {
    examples: fallbackExamples,
    metrics: [
      {
        label: "Одобрено",
        note: "Готовы к retrieval и style matching.",
        value: "2",
      },
      {
        label: "На проверке",
        note: "Нужны ручное решение и векторизация после approval.",
        value: "1",
      },
      {
        label: "Отклонено",
        note: "Не участвуют в подборе примеров.",
        value: "0",
      },
    ],
    modeLabel: "fixtures",
    projectLabel: projectId,
  };
}

function fixtureAiPipeline(): AiPipelineViewModel {
  return {
    context: {
      content: "демо-материал",
      project: "Что поесть? Армавир",
    },
    examples: fallbackExamples,
    factGuards,
    modeLabel: "fixtures",
    runs: fallbackRuns,
    steps: fallbackSteps,
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

async function projectById(projectId: string): Promise<ProjectOut | null> {
  return safeApiGet<ProjectOut>(`/api/v1/projects/${projectId}`);
}

async function firstContentLabel(projectId: string): Promise<string | null> {
  const contentResponse = await safeApiGet<ContentListResponse>(`/api/v1/projects/${projectId}/content-items`);
  const item = contentResponse?.content_items[0];
  if (!item) {
    return null;
  }
  return item.title_internal || item.id;
}

async function rubricNameMap(projectId: string): Promise<Map<string, string>> {
  const rubrics = await safeApiGet<RubricListResponse>(`/api/v1/projects/${projectId}/rubrics`);
  return new Map((rubrics?.rubrics ?? []).map((rubric) => [rubric.id, rubric.name]));
}

async function apiExamplesForProject(projectId: string): Promise<{
  examplesResponse: ExampleListResponse | null;
  items: ExamplePreviewViewModel[];
}> {
  const [examplesResponse, rubricNames] = await Promise.all([
    safeApiGet<ExampleListResponse>(`/api/v1/projects/${projectId}/examples`),
    rubricNameMap(projectId),
  ]);
  const examples = examplesResponse?.examples ?? [];

  return {
    examplesResponse,
    items: examples.map((example) => examplePreview(example, rubricNames)),
  };
}

function apiRunRows(hasContent: boolean): AiRunViewModel[] {
  const status = hasContent ? "готов к запуску" : "нужен материал";
  return [
    { provider: "OpenAI", status, task: "Извлечение фактов" },
    { provider: "OpenAI", status, task: "Сборка мастер-текста" },
    { provider: "OpenAI", status, task: "Крючки" },
    { provider: "OpenAI", status, task: "Оценки" },
    { provider: "OpenAI", status, task: "Проверка качества" },
  ];
}

function exampleMetrics(examples: ExamplePreviewViewModel[]): ProjectExamplesViewModel["metrics"] {
  const approved = examples.filter((example) => example.status === "одобрено").length;
  const pending = examples.filter((example) => example.status === "проверка").length;
  const rejected = examples.filter((example) => example.status === "отклонено").length;

  return [
    {
      label: "Одобрено",
      note: "Готовы к retrieval и style matching.",
      value: String(approved),
    },
    {
      label: "На проверке",
      note: "Нужны ручное решение и векторизация после approval.",
      value: String(pending),
    },
    {
      label: "Отклонено",
      note: "Не участвуют в подборе примеров.",
      value: String(rejected),
    },
  ];
}

async function apiAiPipeline(): Promise<AiPipelineViewModel> {
  const fallback = fixtureAiPipeline();
  const project = await firstWorkspaceProject();

  if (!project) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "API-режим включён, но проект не найден. Показаны демо-данные.",
    };
  }

  const [{ examplesResponse, items }, contentLabel] = await Promise.all([
    apiExamplesForProject(project.id),
    firstContentLabel(project.id),
  ]);

  const notices = [
    examplesResponse ? null : "Список примеров из API недоступен.",
    "Журнал последних AI-запусков пока не читается из API: backend даёт detail/retry/cancel, но не list endpoint.",
  ].filter(Boolean);

  return {
    context: {
      content: contentLabel ?? "материал не найден",
      project: project.name,
    },
    examples: items.length ? items.slice(0, 3) : fallback.examples,
    factGuards,
    modeLabel: "api",
    notice: notices.length ? `${notices.join(" ")} Статусы запуска показаны как техническая готовность.` : undefined,
    runs: apiRunRows(Boolean(contentLabel)),
    steps: fallbackSteps,
  };
}

async function apiProjectExamples(projectId: string): Promise<ProjectExamplesViewModel> {
  const fallback = fixtureProjectExamples(projectId);
  const [project, { examplesResponse, items }] = await Promise.all([
    projectById(projectId),
    apiExamplesForProject(projectId),
  ]);

  return {
    examples: items.length ? items : fallback.examples,
    metrics: items.length ? exampleMetrics(items) : fallback.metrics,
    modeLabel: "api",
    notice: examplesResponse ? undefined : "Список примеров из API недоступен. Показаны демо-данные.",
    projectLabel: project?.name ?? projectId,
  };
}

export async function getAiPipelineViewModel(): Promise<AiPipelineViewModel> {
  if (getDataMode() !== "api") {
    return fixtureAiPipeline();
  }

  try {
    return await apiAiPipeline();
  } catch {
    return {
      ...fixtureAiPipeline(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}

export async function getProjectExamplesViewModel(projectId: string): Promise<ProjectExamplesViewModel> {
  if (getDataMode() !== "api") {
    return fixtureProjectExamples(projectId);
  }

  try {
    return await apiProjectExamples(projectId);
  } catch {
    return {
      ...fixtureProjectExamples(projectId),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}
