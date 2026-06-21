import { studioSummary } from "@/features/content-studio/content-studio-fixtures";
import {
  type ContentItemOut,
  type ContentListResponse,
  type MeResponse,
  type ProjectListResponse,
  type ProjectOut,
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
  materialLabel: string;
  modeLabel: string;
  notice?: string;
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

function fixtureContentIndex(): ContentIndexViewModel {
  return {
    items: fixtureItems.map((item) => item),
    modeLabel: "fixtures",
  };
}

function fixtureContentStudio(contentId: string): ContentStudioViewModel {
  return {
    materialLabel: contentId,
    modeLabel: "fixtures",
    summary: studioSummary,
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
  const rubricNames = await rubricNameMap(item.project_id);

  return {
    materialLabel: item.id,
    modeLabel: "api",
    summary: {
      ...fallback.summary,
      autosave: formatUpdatedAt(item.updated_at),
      project: project?.id === item.project_id ? project.name : "Проект",
      revision: `v${item.version}`,
      rubric: rubricNames.get(item.rubric_id) ?? "Рубрика",
      status: statusLabel(item.status),
      title: item.title_internal,
    },
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
