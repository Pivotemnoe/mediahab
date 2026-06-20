import { rubricList } from "@/features/rubric-builder/rubric-builder-fixtures";
import {
  type MeResponse,
  type ProjectListResponse,
  type ProjectOut,
  type RubricListResponse,
} from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

export interface ProjectIndexViewModel {
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

export interface RubricBuilderViewModel {
  modeLabel: string;
  notice?: string;
  projectLabel: string;
  rubrics: Array<{
    count: string;
    name: string;
    status: string;
    version: string;
  }>;
}

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

function fixtureProjectIndex(): ProjectIndexViewModel {
  return {
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

function fixtureRubricBuilder(projectId: string): RubricBuilderViewModel {
  return {
    modeLabel: "fixtures",
    projectLabel: projectId,
    rubrics: rubricList.map(([name, status, count, version]) => ({
      count,
      name,
      status: rubricStatusLabel(status),
      version,
    })),
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

async function firstWorkspaceId(): Promise<string | null> {
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  return me?.workspaces[0]?.id ?? null;
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
  const rubricsResponse = await safeApiGet<RubricListResponse>(`/api/v1/projects/${projectId}/rubrics`);
  const rubrics = rubricsResponse?.rubrics ?? [];

  return {
    ...fallback,
    modeLabel: "api",
    notice: rubricsResponse ? undefined : "Список рубрик из API недоступен. Показаны демо-данные.",
    rubrics: rubrics.length
      ? rubrics
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((rubric) => ({
            count: rubric.editorial_max_chars
              ? `до ${rubric.editorial_max_chars} знаков`
              : "лимит не задан",
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
