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
  projectId: string;
  projectLabel: string;
  rubrics: Array<{ id: string; name: string }>;
}

export interface StyleOverviewViewModel {
  modeLabel: string;
  notice?: string;
  projects: Array<{
    approvedCount: number | null;
    href: string;
    id: string;
    name: string;
    note: string;
  }>;
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
  id: string;
  rubric: string;
  score: string;
  status: string;
  title: string;
}

const fallbackSteps: AiStepViewModel[] = [
  {
    status: "готово",
    text: "«Наговори» собирает важные детали из твоей записи.",
    title: "Важные детали",
  },
  {
    status: "готово",
    text: "Для нового текста берутся только подходящие примеры стиля.",
    title: "Твоя подача",
  },
  {
    status: "готово",
    text: "Из твоих слов получается цельная публикация.",
    title: "Готовый текст",
  },
  {
    status: "готово",
    text: "Перед публикацией остаётся проверить факты, длину и фото.",
    title: "Последняя проверка",
  },
];

const fallbackRuns: AiRunViewModel[] = [
  { provider: "Наговори", status: "можно начать", task: "Собрать важные детали" },
  { provider: "Наговори", status: "можно начать", task: "Подготовить основной текст" },
  { provider: "Наговори", status: "можно начать", task: "Найти удачное начало" },
  { provider: "Наговори", status: "можно начать", task: "Сохранить авторскую оценку" },
  { provider: "Наговори", status: "можно начать", task: "Проверить готовый текст" },
];

const fallbackExamples: ExamplePreviewViewModel[] = [
  {
    fragments: "сильный интерьер, слабая кухня",
    id: "fixture-puripuri",
    rubric: "Обзор недели",
    score: "8/9",
    status: "одобрено",
    title: "ПуриПури: интерьер спорит с кухней",
  },
  {
    fragments: "бизнес-ланч, цена, порции",
    id: "fixture-old-town",
    rubric: "Поесть до 500 рублей",
    score: "9/9",
    status: "одобрено",
    title: "Старый город: бизнес-ланч без режима выживания",
  },
  {
    fragments: "вес, запах гари, сухая курица",
    id: "fixture-fast-review",
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
    id: example.id,
    rubric: example.rubric_id ? rubricNames.get(example.rubric_id) ?? "Формат" : "Для всего канала",
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
        note: "Участвуют в подборе стиля для новых публикаций.",
        value: "2",
      },
      {
        label: "На проверке",
        note: "Реши, подходят ли они твоему каналу.",
        value: "1",
      },
      {
        label: "Отклонено",
        note: "Не участвуют в подборе примеров.",
        value: "0",
      },
    ],
    modeLabel: "fixtures",
    projectId,
    projectLabel: "Демо-канал",
    rubrics: [],
  };
}

function fixtureAiPipeline(): AiPipelineViewModel {
  return {
    context: {
      content: "пример публикации",
      project: "Что поесть? Армавир",
    },
    examples: fallbackExamples,
    factGuards,
    modeLabel: "fixtures",
    runs: fallbackRuns,
    steps: fallbackSteps,
  };
}

function emptyAiPipeline(notice?: string): AiPipelineViewModel {
  return {
    context: {
      content: "Публикация не выбрана",
      project: "Канал не выбран",
    },
    examples: [],
    factGuards: [],
    modeLabel: "api",
    notice,
    runs: [],
    steps: [],
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
  const status = hasContent ? "можно начать" : "нужна публикация";
  return [
    { provider: "Наговори", status, task: "Собрать важные детали" },
    { provider: "Наговори", status, task: "Подготовить основной текст" },
    { provider: "Наговори", status, task: "Найти удачное начало" },
    { provider: "Наговори", status, task: "Сохранить авторскую оценку" },
    { provider: "Наговори", status, task: "Проверить готовый текст" },
  ];
}

function exampleMetrics(examples: ExamplePreviewViewModel[]): ProjectExamplesViewModel["metrics"] {
  const approved = examples.filter((example) => example.status === "одобрено").length;
  const pending = examples.filter((example) => example.status === "проверка").length;
  const rejected = examples.filter((example) => example.status === "отклонено").length;

  return [
    {
      label: "Одобрено",
      note: "Участвуют в подборе стиля для новых публикаций.",
      value: String(approved),
    },
    {
      label: "На проверке",
      note: "Реши, подходят ли они твоему каналу.",
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
  const project = await firstWorkspaceProject();

  if (!project) {
    return emptyAiPipeline("Сначала создай канал.");
  }

  const [{ examplesResponse, items }, contentLabel] = await Promise.all([
    apiExamplesForProject(project.id),
    firstContentLabel(project.id),
  ]);

  return {
    context: {
      content: contentLabel ?? "публикация не найдена",
      project: project.name,
    },
    examples: items.slice(0, 3),
    factGuards,
    modeLabel: "api",
    notice: examplesResponse ? undefined : "Примеры сейчас не загрузились. Обнови страницу — сохранённые тексты останутся на месте.",
    runs: apiRunRows(Boolean(contentLabel)),
    steps: [],
  };
}

async function apiProjectExamples(projectId: string): Promise<ProjectExamplesViewModel> {
  const [project, { examplesResponse, items }, rubricsResponse] = await Promise.all([
    projectById(projectId),
    apiExamplesForProject(projectId),
    safeApiGet<RubricListResponse>(`/api/v1/projects/${projectId}/rubrics`),
  ]);

  return {
    examples: items,
    metrics: exampleMetrics(items),
    modeLabel: "api",
    notice: examplesResponse ? undefined : "Примеры сейчас не загрузились. Обнови страницу.",
    projectId,
    projectLabel: project?.name ?? projectId,
    rubrics: (rubricsResponse?.rubrics ?? []).map((rubric) => ({ id: rubric.id, name: rubric.name })),
  };
}

export async function getAiPipelineViewModel(): Promise<AiPipelineViewModel> {
  if (getDataMode() !== "api") {
    return fixtureAiPipeline();
  }

  try {
    return await apiAiPipeline();
  } catch {
    return emptyAiPipeline("Помощник сейчас не загрузился. Обнови страницу и попробуй ещё раз.");
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
      examples: [],
      metrics: exampleMetrics([]),
      modeLabel: "api",
      notice: "Примеры сейчас не загрузились. Обнови страницу.",
      projectId,
      projectLabel: "Канал",
      rubrics: [],
    };
  }
}

export async function getStyleOverviewViewModel(): Promise<StyleOverviewViewModel> {
  if (getDataMode() !== "api") {
    return { modeLabel: "fixtures", projects: [] };
  }

  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];
  if (!workspace) {
    return {
      modeLabel: "api",
      notice: "Каналы сейчас не загрузились. Обнови страницу.",
      projects: [],
    };
  }

  const projectsResponse = await safeApiGet<ProjectListResponse>(`/api/v1/workspaces/${workspace.id}/projects`);
  if (!projectsResponse) {
    return {
      modeLabel: "api",
      notice: "Каналы сейчас не загрузились. Обнови страницу.",
      projects: [],
    };
  }

  const projects = await Promise.all(projectsResponse.projects.map(async (project) => {
    const examples = await safeApiGet<ExampleListResponse>(`/api/v1/projects/${project.id}/examples`);
    return {
      approvedCount: examples ? examples.examples.filter((example) => example.status === "approved").length : null,
      href: `/app/projects/${project.id}`,
      id: project.id,
      name: project.name,
      note: project.description ?? project.content_domain ?? "Общие правила можно дополнить позже.",
    };
  }));

  return {
    modeLabel: "api",
    notice: projects.some((project) => project.approvedCount === null)
      ? "Количество примеров для части каналов сейчас не загрузилось."
      : undefined,
    projects,
  };
}
