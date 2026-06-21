import {
  accountSettings,
  permissionNotes,
  sessionRows,
  workspaceRoles,
} from "@/features/account-workspace/account-workspace-fixtures";
import { connectorCards } from "@/features/publication-ops/publication-ops-fixtures";
import {
  type DestinationsResponse,
  type MeResponse,
  type MembersResponse,
  type PaymentsResponse,
  type PlansResponse,
  type ProjectListResponse,
  type SessionsResponse,
  type SubscriptionResponse,
  type UsageResponse,
} from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

type Tone = "danger" | "neutral" | "success" | "warning";

export interface IntegrationConnectorView {
  account: string;
  capability: string;
  name: string;
  permissions: string;
  state: string;
  token: string;
  tone: "neutral" | "success" | "warning";
}

export interface IntegrationsViewModel {
  connectors: IntegrationConnectorView[];
  modeLabel: string;
  notice?: string;
}

export interface BillingViewModel {
  currentPlan: {
    description: string;
    name: string;
    status: string;
  };
  history: Array<{
    amount: string;
    id: string;
    note: string;
    status: string;
  }>;
  limits: Array<{
    label: string;
    max: number;
    tone: Tone;
    value: number;
  }>;
  modeLabel: string;
  notice?: string;
  plans: Array<{
    description: string;
    name: string;
    status: string;
    subtitle: string;
  }>;
}

export interface WorkspaceViewModel {
  invitationStats: Array<{
    label: string;
    value: string;
  }>;
  modeLabel: string;
  notice?: string;
  permissionNotes: Array<{
    label: string;
    text: string;
  }>;
  roles: Array<{
    permissions: string;
    role: string;
    tone: "neutral" | "success";
    user: string;
  }>;
}

export interface AccountViewModel {
  modeLabel: string;
  notice?: string;
  sessions: Array<{
    client: string;
    device: string;
    seen: string;
    state: string;
  }>;
  settings: Array<{
    label: string;
    status: string;
    value: string;
  }>;
}

const fixtureLimits = [
  ["Проекты", 1, 15, "success"],
  ["ИИ-генерации", 62, 250, "warning"],
  ["Расшифровка, мин", 18, 120, "neutral"],
  ["Хранилище, ГБ", 2, 50, "neutral"],
] as const;

const fixturePlans = [
  ["Бесплатный", "Личный тест", "1 проект, ручные публикации", "текущий"],
  ["Старт", "Пилот", "3 проекта, базовые лимиты", "тестовая оплата"],
  ["Pro", "Рабочий режим", "15 проектов, Instagram-флаг", "ручное включение"],
  ["Business", "Команда", "расширенные лимиты", "по запросу"],
] as const;

const fixtureHistory = [
  ["тестовый платёж", "успех в симуляции", "0 ₽", "платёж не списан"],
  ["тестовый счёт", "счёт-заглушка создан", "0 ₽", "счёт-заглушка"],
] as const;

function fixtureIntegrations(): IntegrationsViewModel {
  return {
    connectors: connectorCards.map((connector) => ({ ...connector })),
    modeLabel: "fixtures",
  };
}

function fixtureBilling(): BillingViewModel {
  return {
    currentPlan: {
      description: "Текущий тариф используется для серверной проверки лимитов. Коммерческие цены не зашиты в код.",
      name: "Бесплатный",
      status: "Активен",
    },
    history: fixtureHistory.map(([id, status, amount, note]) => ({
      amount,
      id,
      note,
      status,
    })),
    limits: fixtureLimits.map(([label, value, max, tone]) => ({
      label,
      max,
      tone,
      value,
    })),
    modeLabel: "fixtures",
    plans: fixturePlans.map(([name, subtitle, description, status]) => ({
      description,
      name,
      status,
      subtitle,
    })),
  };
}

function fixtureWorkspace(): WorkspaceViewModel {
  return {
    invitationStats: [
      { label: "Свободные места", value: "4 из 10" },
      { label: "Новые участники", value: "роль «редактор» по умолчанию" },
      { label: "Публикация", value: "content.publish выдаётся отдельно" },
    ],
    modeLabel: "fixtures",
    permissionNotes: permissionNotes.map(([label, text]) => ({ label, text })),
    roles: workspaceRoles.map(([role, user, permissions]) => ({
      permissions,
      role,
      tone: role === "Владелец" ? "success" : "neutral",
      user,
    })),
  };
}

function fixtureAccount(): AccountViewModel {
  return {
    modeLabel: "fixtures",
    sessions: sessionRows.map(([device, client, seen, state]) => ({
      client,
      device,
      seen,
      state,
    })),
    settings: accountSettings.map(([label, value, status]) => ({
      label,
      status,
      value,
    })),
  };
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: "Администратор",
    editor: "Редактор",
    owner: "Владелец",
    viewer: "Наблюдатель",
  };
  return labels[role] ?? role;
}

function publicationPermissionLabel(value: string): string {
  const labels: Record<string, string> = {
    allowed: "может публиковать",
    approval_required: "отправляет на согласование",
    denied: "не публикует",
  };
  return labels[value] ?? value;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "активно",
    cancel_pending: "отмена запрошена",
    disabled: "выключено",
    failed: "ошибка",
    paid: "оплачено",
    paused: "пауза",
    pending: "ожидает",
    simulated: "симуляция",
    trialing: "тестовый режим",
  };
  return labels[status] ?? status;
}

function destinationName(platformKey: string): string {
  const labels: Record<string, string> = {
    generic_webhook: "Универсальный вебхук",
    instagram: "Instagram",
    manual_export: "Ручной экспорт",
    max: "MAX",
    telegram: "Telegram",
  };
  return labels[platformKey] ?? platformKey;
}

function destinationTone(status: string): IntegrationConnectorView["tone"] {
  if (status === "active") {
    return "success";
  }
  if (status === "paused") {
    return "warning";
  }
  return "neutral";
}

function usageTone(status: unknown): Tone {
  if (status === "exceeded") {
    return "danger";
  }
  if (status === "warning") {
    return "warning";
  }
  if (status === "ok") {
    return "success";
  }
  return "neutral";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "недавно";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Moscow",
  }).format(date);
}

function amountLabel(amountMinor: number, currency: string): string {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("ru-RU", {
      currency,
      style: "currency",
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

async function firstWorkspace() {
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  return {
    me,
    workspace: me?.workspaces[0] ?? null,
  };
}

async function firstProjectId(workspaceId: string): Promise<string | null> {
  const projects = await safeApiGet<ProjectListResponse>(`/api/v1/workspaces/${workspaceId}/projects`);
  return projects?.projects[0]?.id ?? null;
}

async function apiIntegrations(): Promise<IntegrationsViewModel> {
  const fallback = fixtureIntegrations();
  const { workspace } = await firstWorkspace();
  if (!workspace) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "API-режим включён, но рабочее пространство не найдено. Показаны демо-данные.",
    };
  }

  const projectId = await firstProjectId(workspace.id);
  const destinations = projectId
    ? await safeApiGet<DestinationsResponse>(`/api/v1/projects/${projectId}/destinations`)
    : null;

  return {
    ...fallback,
    connectors: destinations?.destinations.length
      ? destinations.destinations.map((destination) => ({
          account: destination.name,
          capability: destination.publication_mode,
          name: destinationName(destination.platform_key),
          permissions: destination.connector_key,
          state: statusLabel(destination.status),
          token: destination.connector_key === "manual_export" ? "секрет не нужен" : "секрет хранится на backend",
          tone: destinationTone(destination.status),
        }))
      : fallback.connectors,
    modeLabel: "api",
    notice: destinations
      ? undefined
      : "Список назначений из API недоступен. Показаны демо-данные.",
  };
}

async function apiBilling(): Promise<BillingViewModel> {
  const fallback = fixtureBilling();
  const { workspace } = await firstWorkspace();
  if (!workspace) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "API-режим включён, но рабочее пространство не найдено. Показаны демо-данные.",
    };
  }

  const [usage, subscription, plans, payments] = await Promise.all([
    safeApiGet<UsageResponse>(`/api/v1/workspaces/${workspace.id}/usage`),
    safeApiGet<SubscriptionResponse>(`/api/v1/workspaces/${workspace.id}/subscription`),
    safeApiGet<PlansResponse>("/api/v1/plans"),
    safeApiGet<PaymentsResponse>("/api/v1/billing/payments"),
  ]);

  return {
    ...fallback,
    currentPlan: subscription
      ? {
          description: `${subscription.provider_key} · ${subscription.payment_captured ? "оплата подтверждена" : "без списания"}`,
          name: subscription.plan_name,
          status: statusLabel(subscription.status),
        }
      : fallback.currentPlan,
    history: payments?.payments.length
      ? payments.payments.slice(0, 5).map((payment) => ({
          amount: amountLabel(payment.amount_minor, payment.currency),
          id: payment.provider_payment_id ?? payment.id,
          note: payment.payment_captured ? "списание подтверждено" : "списания нет",
          status: statusLabel(payment.status),
        }))
      : fallback.history,
    limits: usage?.limits?.length
      ? usage.limits.map((limit) => ({
          label: String(limit.label ?? limit.key ?? "Лимит"),
          max: Number(limit.limit ?? 1),
          tone: usageTone(limit.status),
          value: Number(limit.used ?? 0),
        }))
      : fallback.limits,
    modeLabel: "api",
    notice: usage && subscription
      ? undefined
      : "Часть billing API недоступна. Пустые блоки добраны демо-данными.",
    plans: plans?.plans.length
      ? plans.plans.map((plan) => ({
          description: plan.description,
          name: plan.name,
          status: subscription?.plan_key === plan.key ? "текущий" : "доступен",
          subtitle: plan.key,
        }))
      : fallback.plans,
  };
}

async function apiWorkspace(): Promise<WorkspaceViewModel> {
  const fallback = fixtureWorkspace();
  const { workspace } = await firstWorkspace();
  if (!workspace) {
    return {
      ...fallback,
      modeLabel: "api",
      notice: "API-режим включён, но рабочее пространство не найдено. Показаны демо-данные.",
    };
  }

  const members = await safeApiGet<MembersResponse>(`/api/v1/workspaces/${workspace.id}/members`);
  return {
    ...fallback,
    modeLabel: "api",
    notice: members ? undefined : "Список участников из API недоступен. Показаны демо-данные.",
    roles: members?.members.length
      ? members.members.map((member) => ({
          permissions: publicationPermissionLabel(member.publication_permission),
          role: roleLabel(member.role),
          tone: member.role === "owner" ? "success" : "neutral",
          user: member.display_name || member.email,
        }))
      : fallback.roles,
  };
}

async function apiAccount(): Promise<AccountViewModel> {
  const fallback = fixtureAccount();
  const [me, sessions] = await Promise.all([
    safeApiGet<MeResponse>("/api/v1/me"),
    safeApiGet<SessionsResponse>("/api/v1/me/sessions"),
  ]);

  return {
    modeLabel: "api",
    notice: me && sessions ? undefined : "Данные аккаунта из API недоступны частично. Показаны демо-значения.",
    sessions: sessions?.sessions.length
      ? sessions.sessions.map((session) => ({
          client: session.user_agent ?? "неизвестный клиент",
          device: session.current ? "Текущее устройство" : "Сессия",
          seen: formatDate(session.last_seen_at),
          state: session.revoked_at ? "отозвана" : session.current ? "текущая" : "активна",
        }))
      : fallback.sessions,
    settings: me
      ? [
          { label: "Почта", status: me.user.email_verified ? "подтверждена" : "не подтверждена", value: me.user.email },
          { label: "Имя", status: "из профиля", value: me.user.display_name },
          { label: "Workspace", status: "доступно", value: String(me.workspaces.length) },
          { label: "Сессии", status: sessions ? "получены" : "демо", value: String(sessions?.sessions.length ?? fallback.sessions.length) },
        ]
      : fallback.settings,
  };
}

export async function getIntegrationsViewModel(): Promise<IntegrationsViewModel> {
  if (getDataMode() !== "api") {
    return fixtureIntegrations();
  }

  try {
    return await apiIntegrations();
  } catch {
    return {
      ...fixtureIntegrations(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}

export async function getBillingViewModel(): Promise<BillingViewModel> {
  if (getDataMode() !== "api") {
    return fixtureBilling();
  }

  try {
    return await apiBilling();
  } catch {
    return {
      ...fixtureBilling(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}

export async function getWorkspaceViewModel(): Promise<WorkspaceViewModel> {
  if (getDataMode() !== "api") {
    return fixtureWorkspace();
  }

  try {
    return await apiWorkspace();
  } catch {
    return {
      ...fixtureWorkspace(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}

export async function getAccountViewModel(): Promise<AccountViewModel> {
  if (getDataMode() !== "api") {
    return fixtureAccount();
  }

  try {
    return await apiAccount();
  } catch {
    return {
      ...fixtureAccount(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}
