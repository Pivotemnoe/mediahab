import {
  dashboardStats,
  integrationAlerts,
  recentDrafts,
  scheduledPublications,
  usageRows,
} from "@/features/dashboard/dashboard-fixtures";
import {
  type ContentListResponse,
  type MeResponse,
  type NotebookNoteListResponse,
  type ProjectListResponse,
  type PublicationsResponse,
  type SubscriptionResponse,
  type UsageResponse,
} from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

export type DashboardTone = "danger" | "info" | "neutral" | "success" | "warning";

export interface DashboardViewModel {
  integrationAlerts: Array<{
    note: string;
    platform: string;
    tone: DashboardTone;
  }>;
  modeLabel: string;
  notice?: string;
  planLabel: string;
  projects: Array<{
    href: string;
    name: string;
    note: string;
    rubricCount: number;
  }>;
  recentNotes: Array<{
    body: string;
    href: string;
    updatedAt: string;
  }>;
  recentDrafts: Array<{
    href: string;
    project: string;
    rubric: string;
    status: string;
    title: string;
  }>;
  scheduledPublications: Array<{
    platform: string;
    status: string;
    time: string;
  }>;
  stats: Array<{
    label: string;
    note: string;
    value: string;
  }>;
  usageRows: Array<{
    label: string;
    max: number;
    tone: "danger" | "neutral" | "success" | "warning";
    value: number;
  }>;
}

function fixtureDashboard(): DashboardViewModel {
  return {
    integrationAlerts: integrationAlerts.map(([platform, note, tone]) => ({
      note,
      platform,
      tone,
    })),
    modeLabel: "fixtures",
    planLabel: "Старт",
    projects: [],
    recentNotes: [],
    recentDrafts: recentDrafts.map(([title, rubric, status], index) => ({
      href: `/app/content/demo-${index}`,
      project: "Что поесть? Армавир",
      rubric,
      status,
      title,
    })),
    scheduledPublications: scheduledPublications.map(([platform, time, status]) => ({
      platform,
      status,
      time,
    })),
    stats: dashboardStats.map((item) => item),
    usageRows: usageRows.map(([label, value, max, tone]) => ({
      label,
      max,
      tone,
      value,
    })),
  };
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    archived: "архив",
    cancelled: "отменено",
    collecting: "сбор фактов",
    draft: "черновик",
    failed: "ошибка",
    manual_required: "нужен ручной экспорт",
    published: "опубликовано",
    queued: "в очереди",
    ready_for_ai: "готово к ИИ",
    scheduled: "запланировано",
  };
  return labels[status] ?? status;
}

function usageTone(status: string | undefined): "danger" | "neutral" | "success" | "warning" {
  if (status === "exceeded") {
    return "danger";
  }
  if (status === "warning") {
    return "warning";
  }
  return "success";
}

function formatScheduledAt(value: string | null): string {
  if (!value) {
    return "Без времени";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}

async function apiDashboard(): Promise<DashboardViewModel> {
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];

  if (!workspace) {
    return {
      integrationAlerts: [],
      modeLabel: "api",
      notice: "Рабочее пространство не найдено. Обновите страницу или войдите заново.",
      planLabel: "",
      projects: [],
      recentNotes: [],
      recentDrafts: [],
      scheduledPublications: [],
      stats: [],
      usageRows: [],
    };
  }

  const [projectsResponse, usageResponse, subscriptionResponse, publicationsResponse, notesResponse] =
    await Promise.all([
      safeApiGet<ProjectListResponse>(`/api/v1/workspaces/${workspace.id}/projects`),
      safeApiGet<UsageResponse>(`/api/v1/workspaces/${workspace.id}/usage`),
      safeApiGet<SubscriptionResponse>(`/api/v1/workspaces/${workspace.id}/subscription`),
      safeApiGet<PublicationsResponse>(`/api/v1/publications?workspace_id=${workspace.id}`),
      safeApiGet<NotebookNoteListResponse>(`/api/v1/notebook?workspace_id=${workspace.id}&limit=4`),
    ]);

  const projects = projectsResponse?.projects ?? [];
  const contentByProject = await Promise.all(projects.map(async (project) => ({
    project,
    response: await safeApiGet<ContentListResponse>(`/api/v1/projects/${project.id}/content-items`),
  })));
  const contentItems = contentByProject.flatMap(({ project, response }) =>
    (response?.content_items ?? []).map((item) => ({ item, project })),
  );
  const publications = publicationsResponse?.publications ?? [];
  const scheduled = publications
    .filter((publication) => publication.status === "scheduled" || publication.scheduled_at)
    .slice(0, 3);
  const limits = usageResponse?.limits?.slice(0, 3) ?? [];

  return {
    integrationAlerts: [],
    modeLabel: "api",
    notice: projectsResponse && usageResponse
      ? undefined
      : "Часть данных кабинета сейчас не загрузилась. Попробуйте обновить страницу.",
    planLabel: subscriptionResponse?.plan_name ?? "Текущий тариф",
    projects: projects.map((project) => ({
      href: `/app/projects/${project.id}`,
      name: project.name,
      note: project.description ?? project.content_domain ?? "Общие правила можно дополнить в проекте.",
      rubricCount: project.rubric_count ?? 0,
    })),
    recentNotes: (notesResponse?.notes ?? []).map((note) => ({
      body: note.body,
      href: "/app/notebook",
      updatedAt: note.updated_at,
    })),
    recentDrafts: contentItems.slice(0, 6).map(({ item, project }) => ({
      href: `/app/content/${item.id}`,
      project: project.name,
      rubric: `Материал · v${item.version}`,
      status: statusLabel(item.status),
      title: item.title_internal,
    })),
    scheduledPublications: scheduled.map((publication) => ({
          platform: "Публикация",
          status: statusLabel(publication.status),
          time: formatScheduledAt(publication.scheduled_at),
        })),
    stats: [
      {
        label: "Проекты",
        note: projects[0]?.name ?? "Создайте первый проект",
        value: String(projects.length),
      },
      {
        label: "Черновики",
        note: "актуальные материалы",
        value: String(contentItems.length),
      },
      {
        label: "Запланировано",
        note: "активные публикации",
        value: String(scheduled.length),
      },
    ],
    usageRows: limits.length
      ? limits.map((limit) => ({
          label: limit.label ?? limit.key ?? "Лимит",
          max: Number(limit.limit ?? 1),
          tone: usageTone(limit.status),
          value: Number(limit.used ?? 0),
        }))
      : [],
  };
}

export async function getDashboardViewModel(): Promise<DashboardViewModel> {
  if (getDataMode() !== "api") {
    return fixtureDashboard();
  }

  try {
    return await apiDashboard();
  } catch {
    return {
      integrationAlerts: [],
      modeLabel: "api",
      notice: "Данные кабинета сейчас не загрузились. Попробуйте обновить страницу.",
      planLabel: "",
      projects: [],
      recentNotes: [],
      recentDrafts: [],
      scheduledPublications: [],
      stats: [],
      usageRows: [],
    };
  }
}
