"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { guidedActionStateFromApiError, guidedActionUnavailableState } from "@/services/guided-action-errors";
import { buildAddRepeatableGroupPayload, buildSaveGuidedFieldPayload } from "@/services/guided-action-payloads";
import { type GuidedActionState } from "@/services/guided-action-state";
import {
  type BlockOut,
  type BlocksResponse,
  type ContentItemOut,
  type DestinationOut,
  type DestinationsResponse,
  type GenerationRunOut,
  type MeResponse,
  type PlatformVariantOut,
  type PlatformVariantsResponse,
  type PublicationOut,
  type ProjectListResponse,
  type ProjectOut,
  type RubricListResponse,
} from "@/services/openapi-types";
import { ApiRequestError, apiGet, apiRequest } from "@/services/runtime";

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
    return guidedActionStateFromApiError(error);
  }

  return guidedActionUnavailableState();
}

export async function saveGuidedFieldAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  try {
    const payload = buildSaveGuidedFieldPayload(formData);

    await apiRequest<BlockOut>(payload.request.path, {
      body: payload.request.body,
      method: payload.request.method,
    });

    revalidatePath(`/app/content/${payload.contentId}`);
    return successState(payload.successMessage);
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function addRepeatableGroupAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  try {
    const payload = buildAddRepeatableGroupPayload(formData);

    await apiRequest<BlocksResponse>(payload.request.path, {
      body: payload.request.body,
      method: payload.request.method,
    });

    revalidatePath(`/app/content/${payload.contentId}`);
    return successState(payload.successMessage);
  } catch (error) {
    return actionErrorState(error);
  }
}

function formDataString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function messageState(
  message: string,
  options: {
    code?: string;
    tone?: GuidedActionState["tone"];
  } = {},
): GuidedActionState {
  return {
    code: options.code ?? "ok",
    message,
    recoveryAction: "none",
    requestId: null,
    tone: options.tone ?? "success",
  };
}

function generationMessage(run: GenerationRunOut): GuidedActionState {
  if (run.status !== "completed") {
    return messageState(
      run.error_message || "ИИ не смог собрать мастер-текст. Проверьте заполненные факты и повторите.",
      {
        code: run.error_code ?? "generation_failed",
        tone: "danger",
      },
    );
  }

  const response = run.response_json ?? {};
  const masterText = typeof response.master_text === "string" ? response.master_text : "";
  return messageState(
    masterText
      ? `Мастер-текст собран: ${masterText.length} знаков. Проверьте превью и затем публикуйте в тестовый Telegram.`
      : "Мастер-текст собран, но backend не вернул текст в ответе. Обновите страницу перед публикацией.",
  );
}

function objectSize(value: unknown): number {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).length : 0;
}

function arraySize(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function firstHookText(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const first = value[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) {
    return null;
  }
  const text = (first as Record<string, unknown>).text;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

function warningCountFromRun(run: GenerationRunOut): number {
  const response = run.response_json ?? {};
  const warnings = response.warnings;
  const quality = response.quality;
  const qualityWarnings = quality && typeof quality === "object" && !Array.isArray(quality)
    ? (quality as Record<string, unknown>).warnings
    : null;
  const qualityErrors = quality && typeof quality === "object" && !Array.isArray(quality)
    ? (quality as Record<string, unknown>).errors
    : null;
  return arraySize(warnings) + arraySize(qualityWarnings) + arraySize(qualityErrors);
}

function aiAnalysisMessage(factsRun: GenerationRunOut, hookRun: GenerationRunOut): GuidedActionState {
  if (factsRun.status !== "completed") {
    return messageState(factsRun.error_message || "ИИ не смог разобрать факты из диктовки.", {
      code: factsRun.error_code ?? "fact_extraction_failed",
      tone: "danger",
    });
  }
  if (hookRun.status !== "completed") {
    return messageState(hookRun.error_message || "ИИ разобрал факты, но не смог предложить хук.", {
      code: hookRun.error_code ?? "hook_suggestion_failed",
      tone: "warning",
    });
  }

  const factsResponse = factsRun.response_json ?? {};
  const hookResponse = hookRun.response_json ?? {};
  const factCount = objectSize(factsResponse.facts);
  const uncertaintyCount = arraySize(factsResponse.uncertainties);
  const warningCount = arraySize(factsResponse.warnings) + arraySize(hookResponse.warnings);
  const exampleCount = new Set([...factsRun.retrieved_example_ids, ...hookRun.retrieved_example_ids]).size;
  const hook = firstHookText(hookResponse.hook_candidates);

  return messageState(
    [
      `AI-разбор готов: фактов понято ${factCount}, вопросов к уточнению ${uncertaintyCount}, референсов учтено ${exampleCount}.`,
      hook ? `Первый хук: ${hook}` : "Хук не вернулся, но факты сохранены для следующей сборки.",
      warningCount ? `Предупреждений: ${warningCount}.` : "",
    ].filter(Boolean).join(" "),
  );
}

function fullTelegramDraftMessage(
  factsRun: GenerationRunOut,
  ratingsRun: GenerationRunOut,
  hookRun: GenerationRunOut,
  masterRun: GenerationRunOut,
  telegramVariant: PlatformVariantOut,
): GuidedActionState {
  const failedRun = [factsRun, ratingsRun, hookRun, masterRun].find((run) => run.status !== "completed");
  if (failedRun) {
    return messageState(failedRun.error_message || "AI не смог подготовить полный Telegram-пост.", {
      code: failedRun.error_code ?? "full_telegram_draft_failed",
      tone: "danger",
    });
  }

  const masterResponse = masterRun.response_json ?? {};
  const hookResponse = hookRun.response_json ?? {};
  const masterText = typeof masterResponse.master_text === "string" ? masterResponse.master_text : "";
  const exampleCount = new Set([
    ...factsRun.retrieved_example_ids,
    ...ratingsRun.retrieved_example_ids,
    ...hookRun.retrieved_example_ids,
    ...masterRun.retrieved_example_ids,
  ]).size;
  const warningCount = [
    factsRun,
    ratingsRun,
    hookRun,
    masterRun,
  ].reduce((total, run) => total + warningCountFromRun(run), 0);
  const validation = telegramVariant.validation ?? {};
  const validationWarnings = validation.warnings;
  const validationErrors = validation.errors;
  const validationIssueCount = arraySize(validationWarnings) + arraySize(validationErrors);
  const hook = firstHookText(hookResponse.hook_candidates) ?? firstHookText(masterResponse.hook_candidates);
  const tone: GuidedActionState["tone"] = validationIssueCount > 0 || warningCount > 0 ? "warning" : "success";

  return messageState(
    [
      `Telegram-черновик готов: мастер ${masterText.length} знаков, Telegram ${telegramVariant.character_count} знаков.`,
      `Референсов учтено ${exampleCount}.`,
      hook ? `Первый хук: ${hook}` : "",
      warningCount || validationIssueCount
        ? `Проверить перед публикацией: предупреждений ${warningCount}, замечаний Telegram ${validationIssueCount}.`
        : "Валидация Telegram прошла без замечаний.",
    ].filter(Boolean).join(" "),
    { tone },
  );
}

export async function analyzePilotDraftAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  const contentId = formDataString(formData, "contentId");
  try {
    const factsRun = await apiRequest<GenerationRunOut>(`/api/v1/content-items/${contentId}/extract-facts`, {
      method: "POST",
    });
    const hookRun = await apiRequest<GenerationRunOut>(`/api/v1/content-items/${contentId}/suggest-hook`, {
      method: "POST",
    });
    revalidatePath(`/app/content/${contentId}`);
    return aiAnalysisMessage(factsRun, hookRun);
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function prepareFullTelegramDraftAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  const contentId = formDataString(formData, "contentId");
  try {
    const factsRun = await apiRequest<GenerationRunOut>(`/api/v1/content-items/${contentId}/extract-facts`, {
      method: "POST",
    });
    const ratingsRun = await apiRequest<GenerationRunOut>(`/api/v1/content-items/${contentId}/suggest-ratings`, {
      method: "POST",
    });
    const hookRun = await apiRequest<GenerationRunOut>(`/api/v1/content-items/${contentId}/suggest-hook`, {
      method: "POST",
    });
    const masterRun = await apiRequest<GenerationRunOut>(`/api/v1/content-items/${contentId}/assemble-master`, {
      method: "POST",
    });
    if (masterRun.status !== "completed") {
      return fullTelegramDraftMessage(
        factsRun,
        ratingsRun,
        hookRun,
        masterRun,
        {
          character_count: 0,
          content_item_id: contentId,
          created_at: "",
          id: "",
          master_revision_id: "",
          parent_variant_id: null,
          platform_key: "telegram",
          payload: {},
          rendered_text: "",
          revision_number: 0,
          status: "invalid",
          superseded_by_variant_id: null,
          text: "",
          updated_at: "",
          validation: {},
          workspace_id: "",
          approved_at: null,
        },
      );
    }

    const generated = await apiRequest<PlatformVariantsResponse>(
      `/api/v1/content-items/${contentId}/generate-variants`,
      {
        body: { platform_keys: ["telegram"] },
        method: "POST",
      },
    );
    const variant = generated.variants.find((item) => item.platform_key === "telegram");
    if (!variant) {
      return messageState("Мастер собран, но backend не вернул Telegram-вариант.", {
        code: "telegram_variant_missing",
        tone: "danger",
      });
    }
    const validated = await apiRequest<PlatformVariantOut>(`/api/v1/platform-variants/${variant.id}/validate`, {
      method: "POST",
    });

    revalidatePath(`/app/content/${contentId}`);
    return fullTelegramDraftMessage(factsRun, ratingsRun, hookRun, masterRun, validated);
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function assemblePilotMasterAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  const contentId = formDataString(formData, "contentId");
  try {
    const run = await apiRequest<GenerationRunOut>(`/api/v1/content-items/${contentId}/assemble-master`, {
      method: "POST",
    });
    revalidatePath(`/app/content/${contentId}`);
    return generationMessage(run);
  } catch (error) {
    return actionErrorState(error);
  }
}

async function ensurePilotTelegramDestination(projectId: string): Promise<DestinationOut> {
  const name = "Temichev PostHub Test Telegram";
  const destinations = await apiGet<DestinationsResponse>(`/api/v1/projects/${projectId}/destinations`);
  const existing = destinations.destinations.find(
    (destination) =>
      destination.name === name &&
      destination.platform_key === "telegram" &&
      destination.connector_key === "telegram_rich_message" &&
      destination.status === "active",
  );
  if (existing) {
    return existing;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    throw new ApiRequestError(
      "TELEGRAM_BOT_TOKEN is not configured",
      503,
      "/api/v1/projects/:projectId/destinations",
      "telegram_token_missing",
    );
  }

  return apiRequest<DestinationOut>(`/api/v1/projects/${projectId}/destinations`, {
    body: {
      connector_key: "telegram_rich_message",
      configuration: {
        bot_token: botToken,
        channel_username: "@temichev_posthub_test",
        delivery_mode: "live",
        media_delivery_base_url: "https://temichev-posthub.ru/media",
        telegram_mode: "rich_message",
      },
      name,
      platform_key: "telegram",
    },
    method: "POST",
  });
}

function publicationMessage(publication: PublicationOut): GuidedActionState {
  if (publication.status === "published") {
    const external = publication.external_posts[0];
    const externalId = typeof external?.provider_external_id === "string"
      ? external.provider_external_id
      : "Telegram принял публикацию";
    return messageState(`Опубликовано в @temichev_posthub_test. ${externalId}`);
  }

  return messageState(
    publication.last_error_message ||
      `Публикация не завершилась. Статус: ${publication.status}. Проверьте права бота и повторите.`,
    {
      code: publication.last_error_code ?? "publication_failed",
      tone: "danger",
    },
  );
}

function pilotPublicationAlreadySentMessage(publication: PublicationOut): GuidedActionState {
  const external = publication.external_posts[0];
  const externalId = typeof external?.provider_external_id === "string"
    ? external.provider_external_id
    : "Telegram уже принял эту публикацию";
  return messageState(`Эта версия уже опубликована в @temichev_posthub_test. ${externalId}`);
}

export async function publishPilotTelegramAction(
  _previousState: GuidedActionState,
  formData: FormData,
): Promise<GuidedActionState> {
  const contentId = formDataString(formData, "contentId");
  try {
    const item = await apiGet<ContentItemOut>(`/api/v1/content-items/${contentId}`);
    const generated = await apiRequest<PlatformVariantsResponse>(
      `/api/v1/content-items/${contentId}/generate-variants`,
      {
        body: { platform_keys: ["telegram"] },
        method: "POST",
      },
    );
    const variant = generated.variants.find((item) => item.platform_key === "telegram");
    if (!variant) {
      return messageState("Backend не вернул Telegram-вариант. Повторите после обновления страницы.", {
        code: "telegram_variant_missing",
        tone: "danger",
      });
    }

    await apiRequest<PlatformVariantOut>(`/api/v1/platform-variants/${variant.id}/validate`, {
      method: "POST",
    });
    const approved = await apiRequest<PlatformVariantOut>(`/api/v1/platform-variants/${variant.id}/approve`, {
      method: "POST",
    });
    const destination = await ensurePilotTelegramDestination(item.project_id);
    const publication = await apiRequest<PublicationOut>(
      `/api/v1/platform-variants/${approved.id}/publications`,
      {
        body: {
          destination_id: destination.id,
          idempotency_key: `ui-telegram-pilot-${contentId}-${approved.id}`,
        },
        method: "POST",
      },
    );
    if (publication.status === "published") {
      revalidatePath(`/app/content/${contentId}`);
      revalidatePath("/app");
      return pilotPublicationAlreadySentMessage(publication);
    }
    const published = await apiRequest<PublicationOut>(`/api/v1/publications/${publication.id}/publish-now`, {
      method: "POST",
    });

    revalidatePath(`/app/content/${contentId}`);
    revalidatePath("/app");
    return publicationMessage(published);
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function startPilotContentAction(): Promise<void> {
  const me = await apiGet<MeResponse>("/api/v1/me");
  const workspace = me.workspaces[0];
  if (!workspace) {
    throw new Error("Workspace is not available.");
  }

  const projectsResponse = await apiGet<ProjectListResponse>(`/api/v1/workspaces/${workspace.id}/projects`);
  let project = projectsResponse.projects[0];

  if (!project) {
    const imported = await apiRequest<{ project: ProjectOut }>(
      `/api/v1/workspaces/${workspace.id}/projects/from-preset`,
      {
        body: { preset_key: "chto-poest-armavir" },
        method: "POST",
      },
    );
    project = imported.project;
  }

  const rubricsResponse = await apiGet<RubricListResponse>(`/api/v1/projects/${project.id}/rubrics`);
  const rubric = rubricsResponse.rubrics[0];
  if (!rubric) {
    throw new Error("Rubric is not available.");
  }

  const item = await apiRequest<ContentItemOut>(`/api/v1/projects/${project.id}/content-items`, {
    body: {
      rubric_id: rubric.id,
      title_internal: `Пилотный черновик: ${rubric.name}`,
    },
    method: "POST",
  });

  revalidatePath("/app");
  revalidatePath("/app/content");
  redirect(`/app/content/${item.id}`);
}
