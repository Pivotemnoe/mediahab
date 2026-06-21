"use server";

import { revalidatePath } from "next/cache";

import { type GuidedActionState } from "@/services/guided-action-state";
import { type BlockOut, type BlocksResponse } from "@/services/openapi-types";
import { ApiRequestError, apiRequest } from "@/services/runtime";

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

function optionalNumber(formData: FormData, key: string): number | null {
  const value = optionalText(formData, key);
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(value: string): { text: string } {
  return { text: value };
}

function successState(message: string): GuidedActionState {
  return {
    code: "ok",
    message,
    recoveryAction: "none",
    requestId: null,
    tone: "success",
  };
}

function actionErrorState(error: unknown): GuidedActionState {
  if (error instanceof ApiRequestError) {
    const messages: Record<string, string> = {
      csrf_invalid: "Сессия или CSRF-токен устарели. Обновите страницу и повторите сохранение.",
      csrf_required: "Нет CSRF-токена для сохранения. Обновите страницу; для split-domain нужен отдельный cookie/CSRF-настрой.",
      version_conflict: "Материал изменился в другой вкладке или сессии. Обновите страницу перед повторным сохранением.",
    };
    const fallback = error.status >= 500
      ? "Backend сейчас недоступен для сохранения. Повторите позже."
      : "Backend отклонил сохранение. Проверьте поле и повторите действие.";
    return {
      code: error.code,
      message: messages[error.code] ?? fallback,
      recoveryAction: ["csrf_invalid", "csrf_required", "version_conflict"].includes(error.code)
        ? "refresh"
        : "retry",
      requestId: error.requestId,
      tone: error.code === "version_conflict" ? "warning" : "danger",
    };
  }

  return {
    code: "api_unavailable",
    message: "API недоступен или соединение прервано. Изменение не сохранено.",
    recoveryAction: "retry",
    requestId: null,
    tone: "danger",
  };
}

export async function saveGuidedFieldAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  try {
    const contentId = requiredText(formData, "contentId");
    const fieldKey = requiredText(formData, "fieldKey");
    const blockId = optionalText(formData, "blockId");
    const itemVersion = optionalNumber(formData, "itemVersion");
    const value = optionalText(formData, "value") ?? "";
    const intent = optionalText(formData, "intent");
    const sourceType = optionalText(formData, "sourceType") ?? "user_text";
    const lock = intent === "lock";

    if (blockId) {
      await apiRequest<BlockOut>(`/api/v1/content-blocks/${blockId}`, {
        body: {
          lock,
          source_type: sourceType,
          value: textValue(value),
        },
        method: "PATCH",
      });
    } else {
      await apiRequest<BlockOut>(`/api/v1/content-items/${contentId}/blocks/${fieldKey}`, {
        body: {
          lock,
          source_type: sourceType,
          value: textValue(value),
          version: itemVersion,
        },
        method: "PUT",
      });
    }

    revalidatePath(`/app/content/${contentId}`);
    return successState(lock ? "Поле сохранено и зафиксировано." : "Поле сохранено.");
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function addRepeatableGroupAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  try {
    const contentId = requiredText(formData, "contentId");
    const groupKey = requiredText(formData, "groupKey");
    const itemVersion = optionalNumber(formData, "itemVersion");
    const sourceType = optionalText(formData, "sourceType") ?? "user_text";
    const lock = optionalText(formData, "intent") === "lock";
    const values: Record<string, { text: string }> = {};

    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("field:") || typeof value !== "string") {
        continue;
      }
      const fieldKey = key.slice("field:".length);
      values[fieldKey] = textValue(value);
    }

    await apiRequest<BlocksResponse>(`/api/v1/content-items/${contentId}/repeatable-groups/${groupKey}`, {
      body: {
        lock,
        source_type: sourceType,
        values,
        version: itemVersion,
      },
      method: "POST",
    });

    revalidatePath(`/app/content/${contentId}`);
    return successState(lock ? "Позиция добавлена и зафиксирована." : "Позиция добавлена.");
  } catch (error) {
    return actionErrorState(error);
  }
}
