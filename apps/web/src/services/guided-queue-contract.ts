import { type GuidedRecoveryAction } from "@/services/guided-action-state";

export const guidedFormQueuePrefix = "tmh:guided-form-queue:v1";
export const guidedFormQueueEvent = "tmh-guided-form-queue-change";

export interface GuidedQueueJob {
  code: string | null;
  recoveryAction: GuidedRecoveryAction;
  requestId: string | null;
  savedAt: string;
  values: Record<string, string>;
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

export function hasGuidedQueueValues(values: Record<string, string>): boolean {
  return Object.values(values).some((value) => value.trim().length > 0);
}

export function createGuidedQueueJob(params: {
  code: string | null;
  recoveryAction: GuidedRecoveryAction;
  requestId: string | null;
  savedAt?: string;
  values: Record<string, string>;
}): GuidedQueueJob {
  return {
    code: params.code,
    recoveryAction: params.recoveryAction,
    requestId: params.requestId,
    savedAt: params.savedAt ?? new Date().toISOString(),
    values: params.values,
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
      recoveryAction: isGuidedRecoveryAction(parsed.recoveryAction) ? parsed.recoveryAction : "none",
      requestId: typeof parsed.requestId === "string" ? parsed.requestId : null,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      values: Object.fromEntries(
        Object.entries(parsed.values).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      ),
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
