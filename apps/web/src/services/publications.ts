import {
  operationStates,
  publicationAttempts,
  publicationQueue,
  schedulePosture,
} from "@/features/publication-ops/publication-ops-fixtures";
import {
  type AttemptsResponse,
  type DestinationsResponse,
  type MeResponse,
  type ProjectListResponse,
  type PublicationOut,
  type PublicationsResponse,
} from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

type BadgeTone = "danger" | "neutral" | "success" | "warning";

export interface PublicationOpsViewModel {
  attempts: Array<{
    connector: string;
    latency: string;
    number: string;
    result: string;
    status: string;
  }>;
  destinations: Array<{
    name: string;
    text: string;
    title: string;
  }>;
  modeLabel: string;
  notice?: string;
  operationStates: Array<{
    state: string;
    text: string;
  }>;
  queue: Array<{
    destination: string;
    note: string;
    status: string;
    tone: BadgeTone;
  }>;
  schedulePosture: {
    date: string;
    retry: string;
    time: string;
    timezone: string;
  };
  variants: Array<{
    limit: string;
    note: string;
    platform: string;
    status: string;
  }>;
}

const fixtureVariants = [
  ["Telegram", "32 768", "расширенное сообщение", "tg-коллаж + текст"],
  ["MAX", "4 000", "сообщение", "HTML/Markdown + загрузки"],
  ["Instagram", "2 200", "медиа-пакет", "подпись + медиа"],
  ["Ручной экспорт", "100 000", "готов", "пакет формируется"],
  ["Универсальный вебхук", "100 000", "готов", "HTTPS + подпись"],
] as const;

const fixtureDestinations = [
  ["Ручной экспорт", "Скачивание пакета не публикует материал. Нужна ручная отметка."],
  ["Универсальный вебхук", "Только HTTPS, локальные и приватные адреса запрещены."],
  ["Расширенное сообщение Telegram", "Основной режим: tg-коллаж, расширенный HTML, подписанный URL медиа, резервный режим только после подтверждения."],
  ["Сообщение MAX", "Токен только в Authorization, chat_id задаётся вручную или из событий вебхука, лимит медиа ждёт боевой проверки."],
  ["Instagram", "Подпись до 2 200, карусель 2-10, боевой режим под флагом до готовности Meta."],
] as const;

function fixturePublications(): PublicationOpsViewModel {
  return {
    attempts: publicationAttempts.map(([number, connector, status, result, latency]) => ({
      connector,
      latency,
      number,
      result,
      status,
    })),
    destinations: fixtureDestinations.map(([title, text]) => ({ name: title, text, title })),
    modeLabel: "fixtures",
    operationStates: operationStates.map(([state, text]) => ({ state, text })),
    queue: publicationQueue.map(([destination, status, note, tone]) => ({
      destination,
      note,
      status,
      tone,
    })),
    schedulePosture,
    variants: fixtureVariants.map(([platform, limit, status, note]) => ({
      limit,
      note,
      platform,
      status,
    })),
  };
}

function destinationLabel(key: string): string {
  const labels: Record<string, string> = {
    generic_webhook: "Вебхук",
    instagram: "Instagram",
    manual_export: "Ручной экспорт",
    max: "MAX",
    telegram: "Telegram",
  };
  return labels[key] ?? key;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    cancelled: "отменено",
    dead_letter: "ошибка без повторов",
    failed: "ошибка",
    failed_retryable: "ошибка, будет повтор",
    manual_required: "нужен ручной экспорт",
    pending: "ожидает",
    published: "опубликовано",
    queued: "в очереди",
    scheduled: "запланировано",
    simulated: "симуляция",
  };
  return labels[status] ?? status;
}

function toneForStatus(status: string): BadgeTone {
  if (status === "published" || status === "simulated") {
    return "success";
  }
  if (status === "dead_letter" || status === "failed") {
    return "danger";
  }
  if (status === "manual_required" || status === "failed_retryable") {
    return "warning";
  }
  return "neutral";
}

function publicationNote(publication: PublicationOut): string {
  if (publication.external_post_id) {
    return `внешний ID: ${publication.external_post_id}`;
  }
  if (publication.last_error_code) {
    return publication.last_error_message
      ? `${publication.last_error_code}: ${publication.last_error_message}`
      : publication.last_error_code;
  }
  if (publication.scheduled_at) {
    return `запланировано: ${new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      timeZone: "Europe/Moscow",
    }).format(new Date(publication.scheduled_at))}`;
  }
  return publication.publication_method ?? "ожидает обработки";
}

async function getFirstProjectDestinations() {
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];
  if (!workspace) {
    return null;
  }
  const projects = await safeApiGet<ProjectListResponse>(`/api/v1/workspaces/${workspace.id}/projects`);
  const project = projects?.projects[0];
  if (!project) {
    return null;
  }
  return safeApiGet<DestinationsResponse>(`/api/v1/projects/${project.id}/destinations`);
}

async function apiPublications(): Promise<PublicationOpsViewModel> {
  const fallback = fixturePublications();
  const [publicationsResponse, destinationsResponse] = await Promise.all([
    safeApiGet<PublicationsResponse>("/api/v1/publications"),
    getFirstProjectDestinations(),
  ]);
  const publications = publicationsResponse?.publications ?? [];
  const attemptsResponses = await Promise.all(
    publications.slice(0, 4).map((publication) =>
      safeApiGet<AttemptsResponse>(`/api/v1/publications/${publication.id}/attempts`),
    ),
  );
  const attempts = attemptsResponses.flatMap((response) => response?.attempts ?? []);
  const destinations = destinationsResponse?.destinations ?? [];
  const destinationNameById = new Map(
    destinations.map((destination) => [destination.id, destination.name || destinationLabel(destination.platform_key)]),
  );

  return {
    ...fallback,
    attempts: attempts.length
      ? attempts.map((attempt) => ({
          connector: destinationLabel(attempt.connector_key),
          latency: attempt.completed_at ? "завершено" : "в процессе",
          number: `#${attempt.attempt_number}`,
          result: attempt.error_code ?? attempt.status,
          status: statusLabel(attempt.status),
        }))
      : fallback.attempts,
    destinations: destinations.length
      ? destinations.map((destination) => ({
          name: destination.name,
          text: `${statusLabel(destination.status)} · ${destination.publication_mode}`,
          title: destinationLabel(destination.platform_key),
        }))
      : fallback.destinations,
    modeLabel: "api",
    notice: publicationsResponse
      ? undefined
      : "API-режим включён, но список публикаций недоступен. Показаны демо-данные.",
    queue: publications.length
      ? publications.slice(0, 5).map((publication) => ({
          destination: destinationNameById.get(publication.destination_id) ?? "Публикация",
          note: publicationNote(publication),
          status: statusLabel(publication.status),
          tone: toneForStatus(publication.status),
        }))
      : fallback.queue,
  };
}

export async function getPublicationOpsViewModel(): Promise<PublicationOpsViewModel> {
  if (getDataMode() !== "api") {
    return fixturePublications();
  }

  try {
    return await apiPublications();
  } catch {
    return {
      ...fixturePublications(),
      modeLabel: "fixtures после ошибки API",
      notice: "API-режим включён, но backend недоступен. Показаны демо-данные.",
    };
  }
}
