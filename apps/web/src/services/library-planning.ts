import {
  calendarDays,
  calendarQueue,
  exampleFilters,
  exampleLibrary,
  mediaFilters,
  mediaLibrary,
  mediaWarnings,
} from "@/features/library-planning/library-planning-fixtures";
import {
  type ContentListResponse,
  type ContentMediaResponse,
  type ExampleListResponse,
  type MeResponse,
  type ProjectListResponse,
  type PublicationsResponse,
  type RubricListResponse,
} from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

export interface ExamplesLibraryViewModel {
  examples: Array<{
    fragments: string;
    rubric: string;
    score: string;
    status: string;
    title: string;
  }>;
  filters: string[];
  modeLabel: string;
  notice?: string;
}

export interface MediaLibraryViewModel {
  filters: string[];
  items: Array<{
    compatibility: string;
    index: string;
    role: string;
    status: string;
    title: string;
    type: string;
  }>;
  modeLabel: string;
  notice?: string;
  warnings: Array<{
    platform: string;
    warning: string;
  }>;
}

export interface CalendarViewModel {
  days: Array<{
    day: string;
    note: string;
    status: string;
  }>;
  modeLabel: string;
  notice?: string;
  queue: Array<{
    date: string;
    note: string;
    status: string;
    title: string;
  }>;
}

function fixtureExamples(): ExamplesLibraryViewModel {
  return {
    examples: exampleLibrary.map(([rubric, title, status, score, fragments]) => ({
      fragments,
      rubric,
      score,
      status,
      title,
    })),
    filters: [...exampleFilters],
    modeLabel: "fixtures",
  };
}

function fixtureMedia(): MediaLibraryViewModel {
  return {
    filters: [...mediaFilters],
    items: mediaLibrary.map(([index, title, type, status, role, compatibility]) => ({
      compatibility,
      index,
      role,
      status,
      title,
      type,
    })),
    modeLabel: "fixtures",
    warnings: mediaWarnings.map(([platform, warning]) => ({ platform, warning })),
  };
}

function fixtureCalendar(): CalendarViewModel {
  return {
    days: calendarDays.map(([day, status, note]) => ({ day, note, status })),
    modeLabel: "fixtures",
    queue: calendarQueue.map(([date, title, status, note]) => ({
      date,
      note,
      status,
      title,
    })),
  };
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    approved: "одобрено",
    archived: "архив",
    cancelled: "отменено",
    failed: "ошибка",
    manual_required: "нужен ручной экспорт",
    pending: "проверка",
    published: "опубликовано",
    queued: "в очереди",
    rejected: "отклонено",
    scheduled: "запланировано",
    simulated: "симуляция",
  };
  return labels[status] ?? status;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "без даты";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Moscow",
  }).format(date);
}

function formatDay(value: string | null): string {
  if (!value) {
    return "Без даты";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  }).format(date);
}

async function firstProjectId(): Promise<string | null> {
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];
  if (!workspace) {
    return null;
  }
  const projects = await safeApiGet<ProjectListResponse>(`/api/v1/workspaces/${workspace.id}/projects`);
  return projects?.projects[0]?.id ?? null;
}

async function firstContentId(projectId: string): Promise<string | null> {
  const content = await safeApiGet<ContentListResponse>(`/api/v1/projects/${projectId}/content-items`);
  return content?.content_items[0]?.id ?? null;
}

async function rubricNameMap(projectId: string): Promise<Map<string, string>> {
  const rubrics = await safeApiGet<RubricListResponse>(`/api/v1/projects/${projectId}/rubrics`);
  return new Map((rubrics?.rubrics ?? []).map((rubric) => [rubric.id, rubric.name]));
}

async function apiExamples(): Promise<ExamplesLibraryViewModel> {
  const fallback = fixtureExamples();
  const projectId = await firstProjectId();
  if (!projectId) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "API-режим включён, но проект не найден. Показаны демо-данные.",
    };
  }

  const [examplesResponse, rubricNames] = await Promise.all([
    safeApiGet<ExampleListResponse>(`/api/v1/projects/${projectId}/examples`),
    rubricNameMap(projectId),
  ]);
  const examples = examplesResponse?.examples ?? [];

  return {
    ...fallback,
    examples: examples.length
      ? examples.map((example) => ({
          fragments: `${example.character_count} знаков`,
          rubric: example.rubric_id ? rubricNames.get(example.rubric_id) ?? "Рубрика" : "Без рубрики",
          score: example.manual_quality_score ? `${example.manual_quality_score}/9` : "без оценки",
          status: statusLabel(example.status),
          title: example.title ?? `Пример ${example.id.slice(0, 8)}`,
        }))
      : fallback.examples,
    modeLabel: "api",
    notice: examplesResponse ? undefined : "Список примеров из API недоступен. Показаны демо-данные.",
  };
}

async function apiMedia(): Promise<MediaLibraryViewModel> {
  const fallback = fixtureMedia();
  const projectId = await firstProjectId();
  if (!projectId) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "API-режим включён, но проект не найден. Показаны демо-данные.",
    };
  }

  const contentId = await firstContentId(projectId);
  const mediaResponse = contentId
    ? await safeApiGet<ContentMediaResponse>(`/api/v1/content-items/${contentId}/media`)
    : null;
  const media = mediaResponse?.media ?? [];

  return {
    ...fallback,
    items: media.length
      ? media.map((item, index) => ({
          compatibility: `media_id ${item.media_asset_id.slice(0, 8)}`,
          index: String(index + 1).padStart(2, "0"),
          role: item.role,
          status: "связано",
          title: item.caption ?? `Медиа ${item.media_asset_id.slice(0, 8)}`,
          type: "медиа",
        }))
      : fallback.items,
    modeLabel: "api",
    notice: mediaResponse ? undefined : "Медиа материала из API недоступны. Показаны демо-данные.",
  };
}

async function apiCalendar(): Promise<CalendarViewModel> {
  const fallback = fixtureCalendar();
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];
  if (!workspace) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "API-режим включён, но рабочее пространство не найдено. Показаны демо-данные.",
    };
  }
  const publicationsResponse = await safeApiGet<PublicationsResponse>(`/api/v1/publications?workspace_id=${workspace.id}`);
  const publications = publicationsResponse?.publications ?? [];
  const scheduled = publications
    .filter((publication) => publication.scheduled_at || publication.status === "scheduled")
    .slice(0, 8);
  const dayCounts = new Map<string, number>();
  for (const publication of scheduled) {
    const day = formatDay(publication.scheduled_at);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  return {
    days: dayCounts.size
      ? Array.from(dayCounts.entries()).map(([day, count]) => ({
          day,
          note: `${count} событие публикации`,
          status: `${count} публикац.`,
        }))
      : fallback.days,
    modeLabel: "api",
    notice: publicationsResponse ? undefined : "Расписание из API недоступно. Показаны демо-данные.",
    queue: scheduled.length
      ? scheduled.map((publication) => ({
          date: formatDate(publication.scheduled_at ?? publication.queued_at),
          note: publication.last_error_message ?? publication.publication_method ?? "ожидает обработки",
          status: statusLabel(publication.status),
          title: `Публикация ${publication.id.slice(0, 8)}`,
        }))
      : fallback.queue,
  };
}

export async function getExamplesLibraryViewModel(): Promise<ExamplesLibraryViewModel> {
  if (getDataMode() !== "api") {
    return fixtureExamples();
  }

  try {
    return await apiExamples();
  } catch {
    return {
      ...fixtureExamples(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}

export async function getMediaLibraryViewModel(): Promise<MediaLibraryViewModel> {
  if (getDataMode() !== "api") {
    return fixtureMedia();
  }

  try {
    return await apiMedia();
  } catch {
    return {
      ...fixtureMedia(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}

export async function getCalendarViewModel(): Promise<CalendarViewModel> {
  if (getDataMode() !== "api") {
    return fixtureCalendar();
  }

  try {
    return await apiCalendar();
  } catch {
    return {
      ...fixtureCalendar(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}
