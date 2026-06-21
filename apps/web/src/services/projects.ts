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
  return {
    description: project.description ?? project.content_domain ?? "Описание проекта не задано.",
    href: `/app/projects/${project.id}`,
    name: project.name,
    rubrics: `${project.rubric_count ?? 0} рубрик`,
    status: projectStatusLabel(project.status),
    version: `v${project.active_version_number}`,
  };
}

function apiProjectDetailView(project: ProjectOut): ProjectDetailViewModel {
  return {
    modeLabel: "api",
    projectLabel: project.name,
    summaryCards: [
      {
        note: `Активная версия проекта: v${project.active_version_number}.`,
        title: "Версии",
      },
      {
        note: `${project.rubric_count ?? 0} рубрик в текущем проекте.`,
        title: "Рубрики",
      },
      {
        note: project.preset_key ? `Импортирован пресет: ${project.preset_key}.` : "Проект создан без пресета.",
        title: "Импорт пресета",
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
  const fallback = fixtureProjectIndex();
  const workspaceId = await firstWorkspaceId();

  if (!workspaceId) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "API-режим включён, но рабочее пространство не найдено. Показаны демо-данные.",
    };
  }

  const projectsResponse = await safeApiGet<ProjectListResponse>(`/api/v1/workspaces/${workspaceId}/projects`);
  const projects = projectsResponse?.projects ?? [];

  return {
    ...fallback,
    modeLabel: "api",
    notice: projectsResponse ? undefined : "Список проектов из API недоступен. Показаны демо-данные.",
    projects: projects.length ? projects.map(projectView) : fallback.projects,
  };
}

async function apiRubricBuilder(projectId: string): Promise<RubricBuilderViewModel> {
  const fallback = fixtureRubricBuilder(projectId);
  const [project, rubricsResponse] = await Promise.all([
    apiProject(projectId),
    safeApiGet<RubricListResponse>(`/api/v1/projects/${projectId}/rubrics`),
  ]);
  const rubrics = rubricsResponse?.rubrics ?? [];

  return {
    ...fallback,
    modeLabel: "api",
    notice: rubricsResponse ? undefined : "Список рубрик из API недоступен. Показаны демо-данные.",
    projectLabel: project?.name ?? projectId,
    rubrics: rubrics.length
      ? rubrics
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
          }))
      : fallback.rubrics,
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
      ...fixtureProjectIndex(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}

export async function getNewProjectViewModel(): Promise<NewProjectViewModel> {
  if (getDataMode() !== "api") {
    return fixtureNewProject();
  }

  return {
    ...fixtureNewProject(),
    modeLabel: "api",
    notice: "Создание проекта через API не подключено в этом UI-slice. Показан технический wizard.",
  };
}

export async function getProjectDetailViewModel(projectId: string): Promise<ProjectDetailViewModel> {
  if (getDataMode() !== "api") {
    return fixtureProjectDetail(projectId);
  }

  try {
    const project = await apiProject(projectId);
    return project
      ? apiProjectDetailView(project)
      : {
          ...fixtureProjectDetail(projectId),
          modeLabel: "api",
          notice: "Проект из API недоступен. Показаны демо-данные.",
        };
  } catch {
    return {
      ...fixtureProjectDetail(projectId),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
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
      : {
          ...fixtureProjectBuilder(projectId),
          modeLabel: "api",
          notice: "Проект из API недоступен. Показаны демо-данные конструктора.",
        };
  } catch {
    return {
      ...fixtureProjectBuilder(projectId),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
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
      : {
          ...fixtureProjectSettings(projectId),
          modeLabel: "api",
          notice: "Проект из API недоступен. Показаны демо-данные настроек.",
        };
  } catch {
    return {
      ...fixtureProjectSettings(projectId),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
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
      ...fixtureRubricBuilder(projectId),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}

export async function getRubricDetailViewModel(
  projectId: string,
  rubricId: string,
): Promise<RubricDetailViewModel> {
  const viewModel = await getRubricBuilderViewModel(projectId);
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
    selectedRubric,
  };
}
