import { type GuidedRecoveryAction } from "@/services/guided-action-state";

export const guidedFormQueuePrefix = "tmh:guided-form-queue:v1";
export const guidedFormQueueEvent = "tmh-guided-form-queue-change";

export type GuidedQueueValue = string | string[];
export type GuidedQueueValues = Record<string, GuidedQueueValue>;
export type GuidedQueueIntent = "lock" | "save";

export interface GuidedQueueFieldMetadata {
  blockId: string | null;
  contentId: string;
  fieldKey: string;
  intent: GuidedQueueIntent | null;
  itemVersion: number | null;
  kind: "field";
  sourceType: string;
}

export interface GuidedQueueRepeatableGroupMetadata {
  contentId: string;
  groupKey: string;
  intent: GuidedQueueIntent | null;
  itemVersion: number | null;
  kind: "repeatable_group";
  sourceType: string;
}

export type GuidedQueueMetadata = GuidedQueueFieldMetadata | GuidedQueueRepeatableGroupMetadata;

export interface GuidedQueueJob {
  code: string | null;
  fieldTypes: Record<string, string>;
  metadata: GuidedQueueMetadata | null;
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

export function guidedRepeatableGroupQueueKey(params: {
  contentId: string;
  groupKey: string;
}): string {
  return `${guidedFormQueuePrefix}:repeatable:${params.contentId}:${params.groupKey}:new`;
}

export function hasGuidedQueueValues(values: GuidedQueueValues): boolean {
  return Object.values(values).some(hasGuidedQueueValue);
}

export function createGuidedQueueJob(params: {
  code: string | null;
  fieldTypes?: Record<string, string>;
  metadata?: GuidedQueueMetadata | null;
  recoveryAction: GuidedRecoveryAction;
  requestId: string | null;
  savedAt?: string;
  values: GuidedQueueValues;
}): GuidedQueueJob {
  return {
    code: params.code,
    fieldTypes: sanitizeStringRecord(params.fieldTypes),
    metadata: sanitizeQueueMetadata(params.metadata),
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
      metadata: sanitizeQueueMetadata(parsed.metadata),
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

function sanitizeQueueMetadata(value: unknown): GuidedQueueMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const metadata = value as Partial<GuidedQueueFieldMetadata | GuidedQueueRepeatableGroupMetadata>;
  if (metadata.kind !== "field") {
    return sanitizeRepeatableGroupMetadata(metadata);
  }
  if (typeof metadata.contentId !== "string" || !metadata.contentId.trim()) {
    return null;
  }
  if (typeof metadata.fieldKey !== "string" || !metadata.fieldKey.trim()) {
    return null;
  }

  return {
    blockId: typeof metadata.blockId === "string" && metadata.blockId.trim() ? metadata.blockId : null,
    contentId: metadata.contentId,
    fieldKey: metadata.fieldKey,
    intent: isGuidedQueueIntent(metadata.intent) ? metadata.intent : null,
    itemVersion: typeof metadata.itemVersion === "number" && Number.isFinite(metadata.itemVersion)
      ? metadata.itemVersion
      : null,
    kind: "field",
    sourceType: typeof metadata.sourceType === "string" && metadata.sourceType.trim()
      ? metadata.sourceType
      : "user_text",
  };
}

function sanitizeRepeatableGroupMetadata(
  metadata: Partial<GuidedQueueFieldMetadata | GuidedQueueRepeatableGroupMetadata>,
): GuidedQueueRepeatableGroupMetadata | null {
  if (metadata.kind !== "repeatable_group") {
    return null;
  }
  if (typeof metadata.contentId !== "string" || !metadata.contentId.trim()) {
    return null;
  }
  if (typeof metadata.groupKey !== "string" || !metadata.groupKey.trim()) {
    return null;
  }

  return {
    contentId: metadata.contentId,
    groupKey: metadata.groupKey,
    intent: isGuidedQueueIntent(metadata.intent) ? metadata.intent : null,
    itemVersion: typeof metadata.itemVersion === "number" && Number.isFinite(metadata.itemVersion)
      ? metadata.itemVersion
      : null,
    kind: "repeatable_group",
    sourceType: typeof metadata.sourceType === "string" && metadata.sourceType.trim()
      ? metadata.sourceType
      : "user_text",
  };
}

function isGuidedQueueIntent(value: unknown): value is GuidedQueueIntent {
  return value === "lock" || value === "save";
}
