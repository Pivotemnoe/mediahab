import { typedGuidedActionValue } from "@/services/guided-action-values";

type GuidedActionMethod = "PATCH" | "POST" | "PUT";

interface GuidedActionRequest {
  body: unknown;
  method: GuidedActionMethod;
  path: string;
}

export interface GuidedActionPayload {
  contentId: string;
  request: GuidedActionRequest;
  successMessage: string;
}

function requiredText(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing form field: ${key}`);
  }
  return value;
}

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : null;
}

function textValues(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function optionalNumber(formData: FormData, key: string): number | null {
  const value = optionalText(formData, key);
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildSaveGuidedFieldPayload(formData: FormData): GuidedActionPayload {
  const contentId = requiredText(formData, "contentId");
  const fieldKey = requiredText(formData, "fieldKey");
  const fieldType = optionalText(formData, "fieldType");
  const blockId = optionalText(formData, "blockId");
  const itemVersion = optionalNumber(formData, "itemVersion");
  const values = textValues(formData, "value");
  const intent = optionalText(formData, "intent");
  const sourceType = optionalText(formData, "sourceType") ?? "user_text";
  const lock = intent === "lock";

  if (blockId) {
    return {
      contentId,
      request: {
        body: {
          lock,
          source_type: sourceType,
          value: typedGuidedActionValue(values, fieldType),
        },
        method: "PATCH",
        path: `/api/v1/content-blocks/${blockId}`,
      },
      successMessage: lock ? "Поле сохранено и зафиксировано." : "Поле сохранено.",
    };
  }

  return {
    contentId,
    request: {
      body: {
        lock,
        source_type: sourceType,
        value: typedGuidedActionValue(values, fieldType),
        version: itemVersion,
      },
      method: "PUT",
      path: `/api/v1/content-items/${contentId}/blocks/${fieldKey}`,
    },
    successMessage: lock ? "Поле сохранено и зафиксировано." : "Поле сохранено.",
  };
}

export function buildAddRepeatableGroupPayload(formData: FormData): GuidedActionPayload {
  const contentId = requiredText(formData, "contentId");
  const groupKey = requiredText(formData, "groupKey");
  const itemVersion = optionalNumber(formData, "itemVersion");
  const sourceType = optionalText(formData, "sourceType") ?? "user_text";
  const lock = optionalText(formData, "intent") === "lock";
  const valuesByField = new Map<string, string[]>();

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("field:") || typeof value !== "string") {
      continue;
    }
    const fieldKey = key.slice("field:".length);
    valuesByField.set(fieldKey, [...(valuesByField.get(fieldKey) ?? []), value]);
  }
  const values = Object.fromEntries(
    Array.from(valuesByField.entries()).map(([fieldKey, fieldValues]) => [
      fieldKey,
      typedGuidedActionValue(fieldValues, optionalText(formData, `fieldType:${fieldKey}`)),
    ]),
  );

  return {
    contentId,
    request: {
      body: {
        lock,
        source_type: sourceType,
        values,
        version: itemVersion,
      },
      method: "POST",
      path: `/api/v1/content-items/${contentId}/repeatable-groups/${groupKey}`,
    },
    successMessage: lock ? "Позиция добавлена и зафиксирована." : "Позиция добавлена.",
  };
}
