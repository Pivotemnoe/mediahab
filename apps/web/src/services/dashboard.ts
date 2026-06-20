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
  recentDrafts: Array<{
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
    recentDrafts: recentDrafts.map(([title, rubric, status]) => ({ rubric, status, title })),
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
  const fallback = fixtureDashboard();
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];

  if (!workspace) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "API-режим включён, но рабочее пространство не найдено. Показаны демо-данные.",
    };
  }

  const [projectsResponse, usageResponse, subscriptionResponse, publicationsResponse] =
    await Promise.all([
      safeApiGet<ProjectListResponse>(`/api/v1/workspaces/${workspace.id}/projects`),
      safeApiGet<UsageResponse>(`/api/v1/workspaces/${workspace.id}/usage`),
      safeApiGet<SubscriptionResponse>(`/api/v1/workspaces/${workspace.id}/subscription`),
      safeApiGet<PublicationsResponse>("/api/v1/publications"),
    ]);

  const projects = projectsResponse?.projects ?? [];
  const firstProject = projects[0];
  const contentResponse = firstProject
    ? await safeApiGet<ContentListResponse>(`/api/v1/projects/${firstProject.id}/content-items`)
    : null;
  const contentItems = contentResponse?.content_items ?? [];
  const publications = publicationsResponse?.publications ?? [];
  const scheduled = publications
    .filter((publication) => publication.status === "scheduled" || publication.scheduled_at)
    .slice(0, 3);
  const limits = usageResponse?.limits?.slice(0, 3) ?? [];

  return {
    integrationAlerts: fallback.integrationAlerts,
    modeLabel: "api",
    notice: projectsResponse && usageResponse
      ? undefined
      : "Часть API-данных недоступна. Пустые блоки добраны безопасными демо-значениями.",
    planLabel: subscriptionResponse?.plan_name ?? fallback.planLabel,
    recentDrafts: contentItems.length
      ? contentItems.slice(0, 3).map((item) => ({
          rubric: `Материал · v${item.version}`,
          status: statusLabel(item.status),
          title: item.title_internal,
        }))
      : fallback.recentDrafts,
    scheduledPublications: scheduled.length
      ? scheduled.map((publication) => ({
          platform: "Публикация",
          status: statusLabel(publication.status),
          time: formatScheduledAt(publication.scheduled_at),
        }))
      : fallback.scheduledPublications,
    stats: [
      {
        label: "Проекты",
        note: firstProject?.name ?? "Нет активного проекта",
        value: String(projects.length),
      },
      {
        label: "Черновики",
        note: "по данным API",
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
      : fallback.usageRows,
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
      ...fixtureDashboard(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}
