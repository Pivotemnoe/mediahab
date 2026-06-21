import { type GuidedRecoveryAction } from "@/services/guided-action-state";

export const guidedFormQueuePrefix = "tmh:guided-form-queue:v1";
export const guidedFormQueueEvent = "tmh-guided-form-queue-change";

export type GuidedQueueValue = string | string[];
export type GuidedQueueValues = Record<string, GuidedQueueValue>;

export interface GuidedQueueJob {
  code: string | null;
  fieldTypes: Record<string, string>;
  recoveryAction: GuidedRecoveryAction;
  requestId: string | null;
  savedAt: string;
  values: GuidedQueueValues;
}

export function isGuidedFormQueueKey(key: string): boolean {
  return key.startsWith(guidedFormQueuePrefix);
}

export function guidedFieldQueueKey(params: {
  blockId: string | null;
  contentId: string;
  fieldKey: string;
}): string {
  return `${guidedFormQueuePrefix}:field:${params.contentId}:${params.fieldKey}:${params.blockId ?? "new"}`;
}

export function hasGuidedQueueValues(values: GuidedQueueValues): boolean {
  return Object.values(values).some(hasGuidedQueueValue);
}

export function createGuidedQueueJob(params: {
  code: string | null;
  fieldTypes?: Record<string, string>;
  recoveryAction: GuidedRecoveryAction;
  requestId: string | null;
  savedAt?: string;
  values: GuidedQueueValues;
}): GuidedQueueJob {
  return {
    code: params.code,
    fieldTypes: sanitizeStringRecord(params.fieldTypes),
    recoveryAction: params.recoveryAction,
    requestId: params.requestId,
    savedAt: params.savedAt ?? new Date().toISOString(),
    values: sanitizeQueueValues(params.values),
  };
}

export function parseGuidedQueueJob(raw: string | null): GuidedQueueJob | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GuidedQueueJob>;
    if (!parsed || typeof parsed !== "object" || !parsed.values || typeof parsed.values !== "object") {
      return null;
    }

    return {
      code: typeof parsed.code === "string" ? parsed.code : null,
      fieldTypes: sanitizeStringRecord(parsed.fieldTypes),
      recoveryAction: isGuidedRecoveryAction(parsed.recoveryAction) ? parsed.recoveryAction : "none",
      requestId: typeof parsed.requestId === "string" ? parsed.requestId : null,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      values: sanitizeQueueValues(parsed.values),
    };
  } catch {
    return null;
  }
}

export function serializeGuidedQueueJob(job: GuidedQueueJob): string {
  return JSON.stringify(job);
}

function isGuidedRecoveryAction(value: unknown): value is GuidedRecoveryAction {
  return value === "none" || value === "refresh" || value === "retry";
}

function sanitizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function sanitizeQueueValues(value: unknown): GuidedQueueValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const values: GuidedQueueValues = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") {
      values[key] = item;
      continue;
    }
    if (Array.isArray(item)) {
      values[key] = item.filter((entry): entry is string => typeof entry === "string");
    }
  }
  return values;
}

function hasGuidedQueueValue(value: GuidedQueueValue): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => item.trim().length > 0);
  }
  return value.trim().length > 0;
}
