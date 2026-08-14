import {
  fieldPalette,
  platformStrategies,
  previewBlocks,
  repeatableGroups,
  rubricFields,
  rubricList,
  styleRules,
} from "@/features/rubric-builder/rubric-builder-fixtures";
import {
  exampleImports,
  platformOptions,
  projectWizardSteps,
  rubricSuggestions,
} from "@/features/project-wizard/project-wizard-fixtures";
import {
  type MeResponse,
  type ProjectListResponse,
  type ProjectOut,
  type RubricListResponse,
} from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

export interface ProjectIndexViewModel {
  entryPoints: Array<{
    icon: "package" | "preset" | "scratch";
    text: string;
    title: string;
  }>;
  modeLabel: string;
  notice?: string;
  projects: Array<{
    description: string;
    href: string;
    name: string;
    rubrics: string;
    status: string;
    version: string;
  }>;
}

export interface NewProjectViewModel {
  audiencePlaceholder: string;
  exampleImports: string[];
  fields: Array<{
    label: string;
    placeholder: string;
  }>;
  modeLabel: string;
  notice?: string;
  platformOptions: Array<{
    enabled: boolean;
    name: string;
    note: string;
  }>;
  rubricSuggestions: Array<{
    mode: string;
    name: string;
    text: string;
  }>;
  wizardSteps: Array<{
    status: string;
    step: string;
    text: string;
  }>;
  workspaceId: string | null;
}

export interface ProjectDetailViewModel {
  modeLabel: string;
  notice?: string;
  projectLabel: string;
  summaryCards: Array<{
    note: string;
    title: string;
  }>;
}

export interface ProjectBuilderViewModel {
  modeLabel: string;
  notice?: string;
  projectLabel: string;
  settingCards: Array<{
    label: string;
    text: string;
  }>;
  steps: string[];
}

export interface ProjectSettingsViewModel {
  modeLabel: string;
  notice?: string;
  platformOptions: NewProjectViewModel["platformOptions"];
  profileFields: Array<{
    label: string;
    value: string;
  }>;
  projectLabel: string;
  project: ProjectOut | null;
  roleNotes: Array<{
    note: string;
    role: string;
  }>;
  versionNotes: string[];
}

export interface RubricAssetsViewModel {
  fieldPalette: Array<{
    text: string;
    title: string;
  }>;
  platformStrategies: Array<{
    mode: string;
    note: string;
    platform: string;
  }>;
  previewBlocks: Array<{
    index: string;
    name: string;
    note: string;
  }>;
  repeatableGroups: Array<{
    fields: string;
    max: string;
    min: string;
    name: string;
  }>;
  rubricFields: Array<{
    helper: string;
    key: string;
    label: string;
    limit: string;
    locked: boolean;
    required: boolean;
    source: string;
  }>;
  styleRules: string[];
}

export interface RubricBuilderViewModel extends RubricAssetsViewModel {
  modeLabel: string;
  notice?: string;
  projectLabel: string;
  rubrics: Array<{
    count: string;
    href: string;
    id: string;
    name: string;
    status: string;
    version: string;
  }>;
}

export interface RubricDetailViewModel extends RubricBuilderViewModel {
  rawRubric: import("@/services/openapi-types").RubricOut | null;
  selectedRubric: RubricBuilderViewModel["rubrics"][number];
}

const fixtureProjectSteps = [
  "Идентичность",
  "Аудитория",
  "Голос",
  "Площадки",
  "Примеры",
  "Рубрики",
];

const fixtureProjectFields = [
  ["Название проекта", "Что поесть? Армавир"],
  ["URL-slug", "chto-poest-armavir"],
  ["Тематика", "Еда, обзоры, кафе и доставка"],
  ["Основной язык", "Русский"],
] as const;

const fixtureRoleNotes = [
  ["Владелец", "может управлять биллингом, проектом и публикациями"],
  ["Администратор", "может управлять проектом и публикациями"],
  ["Редактор", "готовит материалы, но публикует только при выданном content.publish"],
] as const;

function projectStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "активен",
    archived: "архив",
    draft: "черновик",
  };
  return labels[status] ?? status;
}

function rubricStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "активна",
    archived: "архив",
    draft: "черновик",
  };
  return labels[status] ?? status;
}

function fixtureRubricId(name: string): string {
  const ids: Record<string, string> = {
    "Обзор недели": "obzor-nedeli",
    "Поесть до 500 рублей": "poest-do-500",
    "Фаст-обзор": "fast-obzor",
  };
  return ids[name] ?? encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"));
}

function fixtureRubricAssets(): RubricAssetsViewModel {
  return {
    fieldPalette: fieldPalette.map(([title, text]) => ({ text, title })),
    platformStrategies: platformStrategies.map(([platform, mode, note]) => ({
      mode,
      note,
      platform,
    })),
    previewBlocks: previewBlocks.map(([index, name, note]) => ({ index, name, note })),
    repeatableGroups: repeatableGroups.map(([name, min, max, fields]) => ({
      fields,
      max,
      min,
      name,
    })),
    rubricFields: rubricFields.map((field) => ({ ...field })),
    styleRules: [...styleRules],
  };
}

function fixtureProjectIndex(): ProjectIndexViewModel {
  return {
    entryPoints: [
      {
        icon: "scratch",
        text: "Создать переиспользуемый проект без данных пресета.",
        title: "С нуля",
      },
      {
        icon: "preset",
        text: "Идемпотентно импортировать поддерживаемый пресет.",
        title: "Из пресета",
      },
      {
        icon: "package",
        text: "Проверить JSON проекта и рубрик перед активацией.",
        title: "Импорт пакета",
      },
    ],
    modeLabel: "fixtures",
    projects: [
      {
        description: "Еда, обзоры, кафе, доставка и локальные подборки.",
        href: "/app/projects/chto-poest-armavir",
        name: "Что поесть? Армавир",
        rubrics: "10 рубрик",
        status: "активен",
        version: "v9",
      },
    ],
  };
}

function fixtureNewProject(): NewProjectViewModel {
  return {
    audiencePlaceholder:
      "Локальная аудитория Армавира, живой разговорный тон, честные оценки без рекламной подачи.",
    exampleImports: [...exampleImports],
    fields: fixtureProjectFields.map(([label, placeholder]) => ({ label, placeholder })),
    modeLabel: "fixtures",
    platformOptions: platformOptions.map(([name, note, enabled]) => ({ enabled, name, note })),
    rubricSuggestions: rubricSuggestions.map(([name, text, mode]) => ({ mode, name, text })),
    wizardSteps: projectWizardSteps.map(([step, text, status]) => ({ status, step, text })),
    workspaceId: null,
  };
}

function emptyNewProject(notice?: string, workspaceId: string | null = null): NewProjectViewModel {
  return {
    audiencePlaceholder: "Кому вы пишете и каким голосом хотите с ними разговаривать?",
    exampleImports: [],
    fields: [],
    modeLabel: "api",
    notice,
    platformOptions: [],
    rubricSuggestions: [],
    wizardSteps: [],
    workspaceId,
  };
}

function emptyProjectDetail(projectId: string, notice: string): ProjectDetailViewModel {
  return {
    modeLabel: "api",
    notice,
    projectLabel: projectId,
    summaryCards: [],
  };
}

function emptyProjectBuilder(projectId: string, notice: string): ProjectBuilderViewModel {
  return {
    modeLabel: "api",
    notice,
    projectLabel: projectId,
    settingCards: [],
    steps: [],
  };
}

function emptyProjectSettings(projectId: string, notice: string): ProjectSettingsViewModel {
  return {
    modeLabel: "api",
    notice,
    platformOptions: [],
    profileFields: [],
    project: null,
    projectLabel: projectId,
    roleNotes: [],
    versionNotes: [],
  };
}

function emptyRubricAssets(): RubricAssetsViewModel {
  return {
    fieldPalette: [],
    platformStrategies: [],
    previewBlocks: [],
    repeatableGroups: [],
    rubricFields: [],
    styleRules: [],
  };
}

function fixtureProjectDetail(projectId: string): ProjectDetailViewModel {
  return {
    modeLabel: "fixtures",
    projectLabel: projectId,
    summaryCards: [
      { note: "Управляется через API этапа 03 и неизменяемые записи версий.", title: "Версии" },
      { note: "Рубрики связаны с активной версией проекта и историей материалов.", title: "Рубрики" },
      { note: "Пресет импортируется как данные, без ветвлений в коде.", title: "Импорт пресета" },
    ],
  };
}

function fixtureProjectBuilder(projectId: string): ProjectBuilderViewModel {
  return {
    modeLabel: "fixtures",
    projectLabel: projectId,
    settingCards: ["Название", "Описание", "ИИ-режим", "Политика знаков"].map((label) => ({
      label,
      text: "Сохранённые изменения создают новую версию проекта.",
    })),
    steps: [...fixtureProjectSteps],
  };
}

function fixtureProjectSettings(projectId: string): ProjectSettingsViewModel {
  return {
    modeLabel: "fixtures",
    platformOptions: platformOptions.map(([name, note, enabled]) => ({ enabled, name, note })),
    profileFields: [
      { label: "Название", value: "Что поесть? Армавир" },
      { label: "Slug", value: "chto-poest-armavir" },
      { label: "Язык", value: "ru" },
      { label: "Тематика", value: "Локальные обзоры еды" },
    ],
    projectLabel: projectId,
    project: null,
    roleNotes: fixtureRoleNotes.map(([role, note]) => ({ note, role })),
    versionNotes: [
      "Текущая версия: v9",
      "Изменение настроек создаёт v10",
      "Исторические материалы остаются на старых версиях",
    ],
  };
}

function fixtureRubricBuilder(projectId: string): RubricBuilderViewModel {
  return {
    ...fixtureRubricAssets(),
    modeLabel: "fixtures",
    projectLabel: projectId,
    rubrics: rubricList.map(([name, status, count, version]) => {
      const id = fixtureRubricId(name);
      return {
        count,
        href: `/app/projects/${projectId}/rubrics/${id}`,
        id,
        name,
        status: rubricStatusLabel(status),
        version,
      };
    }),
  };
}

function projectView(project: ProjectOut): ProjectIndexViewModel["projects"][number] {
  const rubricCount = project.rubric_count ?? 0;
  return {
    description: project.description ?? project.content_domain ?? "Описание проекта не задано.",
    href: `/app/projects/${project.id}`,
    name: project.name,
    rubrics: rubricCount === 0 ? "без рубрик" : `${rubricCount} ${rubricCount === 1 ? "рубрика" : rubricCount >= 2 && rubricCount <= 4 ? "рубрики" : "рубрик"}`,
    status: projectStatusLabel(project.status),
    version: `v${project.active_version_number}`,
  };
}

function apiProjectDetailView(project: ProjectOut): ProjectDetailViewModel {
  const rubricCount = project.rubric_count ?? 0;
  return {
    modeLabel: "api",
    projectLabel: project.name,
    summaryCards: [
      {
        note: "Аудитория, голос, структура, обязательные элементы и ограничения действуют для всех публикаций канала.",
        title: "Общие правила",
      },
      {
        note: "Добавьте несколько удачных публикаций, чтобы точнее передать стиль канала.",
        title: "Идеальные примеры",
      },
      {
        note: rubricCount
          ? `${rubricCount} ${rubricCount === 1 ? "рубрика добавлена" : "рубрики добавлены"}.`
          : "Рубрик пока нет. Обычные публикации уже можно создавать по общим правилам.",
        title: "Рубрики",
      },
    ],
  };
}

function apiProjectBuilderView(project: ProjectOut): ProjectBuilderViewModel {
  return {
    modeLabel: "api",
    projectLabel: project.name,
    settingCards: [
      { label: "Название", text: project.name },
      { label: "Описание", text: project.description ?? project.content_domain ?? "Описание не задано." },
      { label: "ИИ-режим", text: "Настройки берутся из активной версии проекта." },
      { label: "Политика знаков", text: `Активная версия: v${project.active_version_number}.` },
    ],
    steps: [...fixtureProjectSteps],
  };
}

function apiProjectSettingsView(project: ProjectOut): ProjectSettingsViewModel {
  return {
    modeLabel: "api",
    platformOptions: platformOptions.map(([name, note, enabled]) => ({ enabled, name, note })),
    profileFields: [
      { label: "Название", value: project.name },
      { label: "Slug", value: project.slug },
      { label: "Язык", value: project.language },
      { label: "Тематика", value: project.content_domain ?? "не задана" },
    ],
    projectLabel: project.name,
    project,
    roleNotes: fixtureRoleNotes.map(([role, note]) => ({ note, role })),
    versionNotes: [
      `Текущая версия: v${project.active_version_number}`,
      `Следующее изменение создаст v${project.active_version_number + 1}`,
      "Исторические материалы остаются на старых версиях",
    ],
  };
}

async function firstWorkspaceId(): Promise<string | null> {
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  return me?.workspaces[0]?.id ?? null;
}

async function apiProject(projectId: string): Promise<ProjectOut | null> {
  return safeApiGet<ProjectOut>(`/api/v1/projects/${projectId}`);
}

async function apiProjectIndex(): Promise<ProjectIndexViewModel> {
  const workspaceId = await firstWorkspaceId();

  if (!workspaceId) {
    return {
      entryPoints: [],
      modeLabel: "api",
      notice: "Рабочее пространство не найдено. Обновите страницу или войдите заново.",
      projects: [],
    };
  }

  const projectsResponse = await safeApiGet<ProjectListResponse>(`/api/v1/workspaces/${workspaceId}/projects`);
  const projects = projectsResponse?.projects ?? [];

  return {
    entryPoints: [],
    modeLabel: "api",
    notice: projectsResponse ? undefined : "Не удалось загрузить проекты. Попробуйте обновить страницу.",
    projects: projects.map(projectView),
  };
}

async function apiRubricBuilder(projectId: string): Promise<RubricBuilderViewModel> {
  const [project, rubricsResponse] = await Promise.all([
    apiProject(projectId),
    safeApiGet<RubricListResponse>(`/api/v1/projects/${projectId}/rubrics`),
  ]);
  const rubrics = rubricsResponse?.rubrics ?? [];

  return {
    ...emptyRubricAssets(),
    modeLabel: "api",
    notice: rubricsResponse ? undefined : "Не удалось загрузить рубрики. Попробуйте обновить страницу.",
    projectLabel: project?.name ?? projectId,
    rubrics: rubrics
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((rubric) => ({
            count: rubric.editorial_max_chars
              ? `до ${rubric.editorial_max_chars} знаков`
              : "лимит не задан",
            href: `/app/projects/${projectId}/rubrics/${rubric.id}`,
            id: rubric.id,
            name: rubric.name,
            status: rubricStatusLabel(rubric.status),
            version: `v${rubric.active_version_number}`,
          })),
  };
}

export async function getProjectIndexViewModel(): Promise<ProjectIndexViewModel> {
  if (getDataMode() !== "api") {
    return fixtureProjectIndex();
  }

  try {
    return await apiProjectIndex();
  } catch {
    return {
      entryPoints: [],
      modeLabel: "api",
      notice: "Данные проектов сейчас не загрузились. Попробуйте обновить страницу.",
      projects: [],
    };
  }
}

export async function getNewProjectViewModel(): Promise<NewProjectViewModel> {
  if (getDataMode() !== "api") {
    return fixtureNewProject();
  }

  try {
    const workspaceId = await firstWorkspaceId();
    return emptyNewProject(
      workspaceId ? undefined : "Рабочее пространство не найдено. Обновите страницу или войдите заново.",
      workspaceId,
    );
  } catch {
    return emptyNewProject("Форма проекта сейчас не загрузилась. Попробуйте обновить страницу.");
  }
}

export async function getProjectDetailViewModel(projectId: string): Promise<ProjectDetailViewModel> {
  if (getDataMode() !== "api") {
    return fixtureProjectDetail(projectId);
  }

  try {
    const project = await apiProject(projectId);
    return project
      ? apiProjectDetailView(project)
      : emptyProjectDetail(projectId, "Проект не найден или у вас нет к нему доступа.");
  } catch {
    return emptyProjectDetail(projectId, "Данные проекта сейчас не загрузились. Попробуйте обновить страницу.");
  }
}

export async function getProjectBuilderViewModel(projectId: string): Promise<ProjectBuilderViewModel> {
  if (getDataMode() !== "api") {
    return fixtureProjectBuilder(projectId);
  }

  try {
    const project = await apiProject(projectId);
    return project
      ? apiProjectBuilderView(project)
      : emptyProjectBuilder(projectId, "Проект не найден или у вас нет к нему доступа.");
  } catch {
    return emptyProjectBuilder(projectId, "Настройки проекта сейчас не загрузились. Попробуйте обновить страницу.");
  }
}

export async function getProjectSettingsViewModel(projectId: string): Promise<ProjectSettingsViewModel> {
  if (getDataMode() !== "api") {
    return fixtureProjectSettings(projectId);
  }

  try {
    const project = await apiProject(projectId);
    return project
      ? apiProjectSettingsView(project)
      : emptyProjectSettings(projectId, "Проект не найден или у вас нет к нему доступа.");
  } catch {
    return emptyProjectSettings(projectId, "Правила проекта сейчас не загрузились. Попробуйте обновить страницу.");
  }
}

export async function getRubricBuilderViewModel(projectId: string): Promise<RubricBuilderViewModel> {
  if (getDataMode() !== "api") {
    return fixtureRubricBuilder(projectId);
  }

  try {
    return await apiRubricBuilder(projectId);
  } catch {
    return {
      ...emptyRubricAssets(),
      modeLabel: "api",
      notice: "Рубрики сейчас не загрузились. Попробуйте обновить страницу.",
      projectLabel: projectId,
      rubrics: [],
    };
  }
}

export async function getRubricDetailViewModel(
  projectId: string,
  rubricId: string,
): Promise<RubricDetailViewModel> {
  const viewModel = await getRubricBuilderViewModel(projectId);
  const rawRubric = getDataMode() === "api"
    ? await safeApiGet<import("@/services/openapi-types").RubricOut>(`/api/v1/rubrics/${rubricId}`)
    : null;
  const selectedRubric =
    viewModel.rubrics.find((rubric) => rubric.id === rubricId) ??
    viewModel.rubrics.find((rubric) => rubric.href.endsWith(`/${rubricId}`)) ??
    viewModel.rubrics[0] ?? {
      count: "поля не настроены",
      href: `/app/projects/${projectId}/rubrics/${rubricId}`,
      id: rubricId,
      name: "Новая рубрика",
      status: "черновик",
      version: "v1",
    };

  return {
    ...viewModel,
    rawRubric,
    selectedRubric,
  };
}
