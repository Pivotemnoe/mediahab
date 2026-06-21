"use server";

import { revalidatePath } from "next/cache";

import { type BlockOut, type BlocksResponse } from "@/services/openapi-types";
import { apiRequest } from "@/services/runtime";

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

export async function saveGuidedFieldAction(formData: FormData): Promise<void> {
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
}

export async function addRepeatableGroupAction(formData: FormData): Promise<void> {
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
}
