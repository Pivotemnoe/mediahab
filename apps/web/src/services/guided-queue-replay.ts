import { typedGuidedActionValue, type GuidedActionValue } from "@/services/guided-action-values";
import { type GuidedQueueJob } from "@/services/guided-queue-contract";
import { type GuidedQueueEntry } from "@/services/guided-queue-store";

export type GuidedQueueReplayStatus = "empty" | "manual_retry_required" | "offline";
export type GuidedQueueReplayReason =
  | "http_only_cookie_csrf_required"
  | "network_unavailable"
  | "no_queue_jobs";

export interface GuidedQueueReplayReadiness {
  canAutoReplay: false;
  jobCount: number;
  reason: GuidedQueueReplayReason;
  status: GuidedQueueReplayStatus;
  shellMessage: string | null;
}

export interface GuidedQueueReplayDraft {
  fieldTypes: Record<string, string>;
  missingFieldTypes: string[];
  typedValues: Record<string, GuidedActionValue>;
  valueCount: number;
}

type GuidedQueueReplayRequestMethod = "PATCH" | "PUT";

export interface GuidedQueueReplayRequest {
  body: unknown;
  method: GuidedQueueReplayRequestMethod;
  path: string;
}

export interface GuidedQueueReplayRequestDraftReady {
  contentId: string;
  request: GuidedQueueReplayRequest;
  status: "ready";
  successMessage: string;
  typedDraft: GuidedQueueReplayDraft;
}

export interface GuidedQueueReplayRequestDraftIncomplete {
  missing: string[];
  status: "incomplete";
  typedDraft: GuidedQueueReplayDraft;
}

export type GuidedQueueReplayRequestDraft =
  | GuidedQueueReplayRequestDraftIncomplete
  | GuidedQueueReplayRequestDraftReady;

export function buildGuidedQueueReplayDraft(job: GuidedQueueJob): GuidedQueueReplayDraft {
  const entries = Object.entries(job.values);
  const typedValues = Object.fromEntries(
    entries.map(([key, value]) => [
      key,
      typedGuidedActionValue(Array.isArray(value) ? value : [value], job.fieldTypes[key] ?? null),
    ]),
  );

  return {
    fieldTypes: { ...job.fieldTypes },
    missingFieldTypes: entries
      .filter(([key, value]) => hasReplayDraftValue(value) && !job.fieldTypes[key])
      .map(([key]) => key),
    typedValues,
    valueCount: entries.length,
  };
}

export function buildGuidedQueueReplayRequestDraft(job: GuidedQueueJob): GuidedQueueReplayRequestDraft {
  const typedDraft = buildGuidedQueueReplayDraft(job);
  const missing: string[] = [];
  const metadata = job.metadata;

  if (!metadata) {
    missing.push("metadata");
  }
  if (!metadata?.intent) {
    missing.push("metadata.intent");
  }
  if (!Object.prototype.hasOwnProperty.call(typedDraft.typedValues, "value")) {
    missing.push("values.value");
  }

  if (!metadata || !metadata.intent || !Object.prototype.hasOwnProperty.call(typedDraft.typedValues, "value")) {
    return {
      missing,
      status: "incomplete",
      typedDraft,
    };
  }

  const lock = metadata.intent === "lock";
  const value = typedDraft.typedValues.value;
  const successMessage = lock ? "Поле сохранено и зафиксировано." : "Поле сохранено.";

  if (metadata.blockId) {
    return {
      contentId: metadata.contentId,
      request: {
        body: {
          lock,
          source_type: metadata.sourceType,
          value,
        },
        method: "PATCH",
        path: `/api/v1/content-blocks/${metadata.blockId}`,
      },
      status: "ready",
      successMessage,
      typedDraft,
    };
  }

  return {
    contentId: metadata.contentId,
    request: {
      body: {
        lock,
        source_type: metadata.sourceType,
        value,
        version: metadata.itemVersion,
      },
      method: "PUT",
      path: `/api/v1/content-items/${metadata.contentId}/blocks/${metadata.fieldKey}`,
    },
    status: "ready",
    successMessage,
    typedDraft,
  };
}

function hasReplayDraftValue(value: string | string[]): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => item.trim().length > 0);
  }
  return value.trim().length > 0;
}

export function getGuidedQueueReplayReadiness(params: {
  entries: GuidedQueueEntry[];
  online: boolean;
}): GuidedQueueReplayReadiness {
  const jobCount = params.entries.length;

  if (jobCount === 0) {
    return {
      canAutoReplay: false,
      jobCount,
      reason: "no_queue_jobs",
      shellMessage: params.online
        ? null
        : "Нет сети: черновики сохраняются локально, ИИ и публикации недоступны.",
      status: params.online ? "empty" : "offline",
    };
  }

  if (!params.online) {
    return {
      canAutoReplay: false,
      jobCount,
      reason: "network_unavailable",
      shellMessage: `Нет сети: ${formatQueuedFields(jobCount)} в локальной очереди, ИИ и публикации недоступны.`,
      status: "offline",
    };
  }

  return {
    canAutoReplay: false,
    jobCount,
    reason: "http_only_cookie_csrf_required",
    shellMessage: `Есть несинхронизированные поля: ${jobCount}. Автоповтор выключен: откройте материал и повторите сохранение.`,
    status: "manual_retry_required",
  };
}

function formatQueuedFields(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} поле`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} поля`;
  }
  return `${count} полей`;
}
